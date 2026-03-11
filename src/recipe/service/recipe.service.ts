import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Subject } from 'rxjs';
import { RecipeRepository } from '../repository/recipe.repository';
import { SearchRecipeDto, IngredientItem, CreateRecipeDto } from '../dto/recipe.dto';
import { IRecipe, ISearchResult } from '../interface/recipe.interface';

// SSE broadcast bus — any module can import this
export const recipeEventBus = new Subject<{ type: 'deleted' | 'updated'; recipeId: string }>();

const RECIPES_PER_PAGE = 6;

@Injectable()
export class RecipeService {
  private readonly logger = new Logger(RecipeService.name);
  constructor(private readonly recipeRepository: RecipeRepository) {}

  // ── Veg detection ─────────────────────────────────────────────────
  private isVegetarian(title: string, ingredients: string[]): boolean {
    const meat = /\b(chicken|beef|pork|lamb|turkey|duck|fish|salmon|tuna|shrimp|prawn|crab|lobster|bacon|ham|sausage|meat|veal|venison|goat|mutton|anchovy|lard|pepperoni|salami|chorizo|pancetta|prosciutto|mince|cod|halibut|tilapia|sardine|mackerel|herring|clam|oyster|scallop|squid|octopus)\b/i;
    return !meat.test(title + ' ' + ingredients.join(' '));
  }

  // =================================================================
  // MAIN SEARCH — real pagination on actual results
  // =================================================================
  async searchRecipes(dto: SearchRecipeDto, page = 1, userId?: string): Promise<ISearchResult> {
    const ingredientNames = dto.ingredients.map(i => i.name.toLowerCase().trim()).filter(Boolean);
    if (!ingredientNames.length) return { recipes: [], query: '', totalFound: 0, page: 1, totalPages: 0 };
    const query = ingredientNames.join(', ');

    // 1. Community recipes (OR match across ingredients)
    const communityDocs = await this.recipeRepository.findUserRecipesByIngredients(ingredientNames);
    const communityRecipes: IRecipe[] = communityDocs.map(r => ({
      ...(r as any),
      _id: r._id?.toString(),
      isSaved: userId ? (r.savedByUserIds?.includes(userId) ?? false) : false,
      savedByUserIds: r.savedByUserIds || [],
      likes: r.savedByUserIds?.length || 0,
      isUserCreated: true,
    }));

    // 2. Crawl 12 sites in parallel — get ALL raw results for first search
    const crawledRecipes = await this.crawlAllSites(ingredientNames);

    // 3. Deduplicate (community wins over crawled on same title)
    const communityTitles = new Set(communityRecipes.map(r => r.title.toLowerCase().trim()));
    const uniqueWeb = crawledRecipes.filter(r => !communityTitles.has(r.title.toLowerCase().trim()));

    // 4. Full result set — community first, then web
    const allResults = [...communityRecipes, ...uniqueWeb];

    if (allResults.length === 0) {
      return { recipes: [], query, totalFound: 0, page: 1, totalPages: 0 };
    }

    // Return ALL results — frontend handles pagination client-side
    const totalFound = allResults.length;
    const totalPages = Math.ceil(totalFound / RECIPES_PER_PAGE);
    return { recipes: allResults, query, totalFound, page: 1, totalPages };
  }

  // =================================================================
  // PARALLEL MULTI-SITE CRAWLER — searches each ingredient separately
  // then merges, deduplicates, filters out article pages
  // =================================================================
  private async crawlAllSites(ingredientNames: string[]): Promise<IRecipe[]> {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    // Build search jobs — each ingredient searched separately on each site
    // This ensures "tomato" results appear even when "onion, tomato" is searched
    const uniqueIngredients = [...new Set(ingredientNames)];
    const searchTerms = uniqueIngredients.map(i => encodeURIComponent(i + ' recipe'));

    const siteConfigs = [
      { name: 'BBC Good Food',   parser: 'bbcgoodfood',   urlFn: (q: string) => `https://www.bbcgoodfood.com/search?q=${q}` },
      { name: 'Minimalist Baker', parser: 'generic',       urlFn: (q: string) => `https://minimalistbaker.com/?s=${q}` },
      { name: 'Love & Lemons',   parser: 'generic',       urlFn: (q: string) => `https://www.loveandlemons.com/?s=${q}` },
      { name: 'Food.com',        parser: 'foodcom',       urlFn: (q: string) => `https://www.food.com/search/${q}` },
      { name: 'Delish',          parser: 'delish',        urlFn: (q: string) => `https://www.delish.com/search/?q=${q}` },
      { name: 'AllRecipes',      parser: 'allrecipes',    urlFn: (q: string) => `https://www.allrecipes.com/search?q=${q}` },
      { name: 'Simply Recipes',  parser: 'simplyrecipes', urlFn: (q: string) => `https://www.simplyrecipes.com/search/?q=${q}` },
      { name: 'Epicurious',      parser: 'epicurious',    urlFn: (q: string) => `https://www.epicurious.com/search/${q}?content=recipe` },
      { name: 'Serious Eats',    parser: 'seriouseats',   urlFn: (q: string) => `https://www.seriouseats.com/search?q=${q}` },
      { name: 'Tasty',           parser: 'tasty',         urlFn: (q: string) => `https://tasty.co/search?q=${q}` },
      { name: 'Yummly',          parser: 'yummly',        urlFn: (q: string) => `https://www.yummly.com/recipes?q=${q}` },
      { name: 'Cookie & Kate',   parser: 'generic',       urlFn: (q: string) => `https://cookieandkate.com/?s=${q}` },
    ];

    // Create one job per (site × ingredient)
    const jobs = siteConfigs.flatMap((site, siteIdx) =>
      searchTerms.map(q => ({ site, q, siteIdx }))
    );

    const settled = await Promise.allSettled(
      jobs.map(async ({ site, q, siteIdx }) => {
        try {
          const resp = await axios.get(site.urlFn(q), { headers, timeout: 12000, maxRedirects: 3 });
          const $ = cheerio.load(resp.data);
          const results = this.parseSite($, site.parser, site.name, ingredientNames, siteIdx);
          if (results.length > 0) this.logger.debug(`${site.name} [${decodeURIComponent(q)}]: ${results.length} recipes`);
          return results;
        } catch (e) {
          this.logger.debug(`${site.name} failed: ${(e as Error).message}`);
          return [] as IRecipe[];
        }
      })
    );

    // Merge all, deduplicate by title
    const seen = new Set<string>();
    const all: IRecipe[] = [];
    settled.forEach(r => {
      if (r.status === 'fulfilled') {
        r.value.forEach(recipe => {
          const key = recipe.title.toLowerCase().replace(/\s+/g, ' ').trim();
          if (key.length >= 4 && !seen.has(key) && recipe.sourceUrl) {
            seen.add(key);
            all.push(recipe);
          }
        });
      }
    });

    return all;
  }

  // =================================================================
  // PER-SITE PARSERS
  // =================================================================
  private parseSite($: cheerio.CheerioAPI, parser: string, sourceName: string, ingredientNames: string[], siteIdx: number): IRecipe[] {
    const recipes: IRecipe[] = [];
    const MAX = 10; // max per site

    const make = (title: string, href: string, imgSrc: string, desc?: string): IRecipe => ({
      title: title.replace(/\s+/g, ' ').trim(),
      description: desc?.trim() || `A delicious recipe featuring ${ingredientNames.slice(0, 3).join(', ')}. Click to view the full recipe on ${sourceName}.`,
      ingredients: ingredientNames.map(n => n.charAt(0).toUpperCase() + n.slice(1)),
      instructions: ['Visit the source link below for complete step-by-step instructions.'],
      imageUrl: imgSrc.startsWith('http') ? imgSrc : this.getSmartImage(title, '', siteIdx),
      sourceUrl: href,
      prepTime: '15 mins', cookTime: '30 mins', servings: '4',
      tags: ingredientNames.slice(0, 2),
      likes: 0, savedByUserIds: [], isSaved: false, isUserCreated: false,
      isVegetarian: this.isVegetarian(title, ingredientNames),
      source: sourceName,
    });

    if (parser === 'allrecipes') {
      $('a[href*="/recipe/"]').each((_, el) => {
        if (recipes.length >= MAX) return false as any;
        const $el = $(el);
        const href = $el.attr('href') || '';
        if (!href.match(/allrecipes\.com\/recipe\/\d+|^\/recipe\/\d+/) || href.includes('#')) return;
        const title = $el.find('[class*="card__title"],[class*="elementTitle"],h3').first().text().trim()
          || $el.attr('aria-label')?.replace(/recipe/i, '').trim() || $el.text().split('\n')[0].trim();
        if (!this.vt(title)) return;
        const img = this.fi($el);
        const full = href.startsWith('http') ? href : `https://www.allrecipes.com${href}`;
        recipes.push(make(title, full, img));
      });
    }

    else if (parser === 'bbcgoodfood') {
      $('a[href*="/recipes/"]').each((_, el) => {
        if (recipes.length >= MAX) return false as any;
        const $el = $(el);
        const href = $el.attr('href') || '';
        if (!href.match(/\/recipes\/\d+-\w+/) || href.includes('#')) return;
        const title = $el.find('h3,[class*="heading"],[class*="title"]').first().text().trim()
          || $el.attr('aria-label')?.trim() || '';
        if (!this.vt(title)) return;
        const desc = $el.find('p').first().text().trim();
        const full = href.startsWith('http') ? href : `https://www.bbcgoodfood.com${href}`;
        recipes.push(make(title, full, this.fi($el), desc));
      });
    }

    else if (parser === 'foodcom') {
      $('a[href*="food.com/recipe/"]').each((_, el) => {
        if (recipes.length >= MAX) return false as any;
        const $el = $(el);
        const href = $el.attr('href') || '';
        const title = $el.find('[class*="title"],h3,[itemprop="name"]').first().text().trim()
          || $el.attr('title')?.trim() || '';
        if (!this.vt(title)) return;
        recipes.push(make(title, href, this.fi($el)));
      });
    }

    else if (parser === 'epicurious') {
      $('a[href*="/recipes/food"]').each((_, el) => {
        if (recipes.length >= MAX) return false as any;
        const $el = $(el);
        const href = $el.attr('href') || '';
        const title = $el.find('h4,h3,[class*="title"]').first().text().trim() || $el.text().split('\n')[0].trim();
        if (!this.vt(title)) return;
        const full = href.startsWith('http') ? href : `https://www.epicurious.com${href}`;
        recipes.push(make(title, full, this.fi($el)));
      });
    }

    else if (parser === 'simplyrecipes') {
      $('a[href*="simplyrecipes.com"]').each((_, el) => {
        if (recipes.length >= MAX) return false as any;
        const $el = $(el);
        const href = $el.attr('href') || '';
        if (!href.match(/simplyrecipes\.com\/recipes\//) || href.includes('#')) return;
        const title = $el.find('[class*="title"],h2,h3').first().text().trim()
          || $el.attr('aria-label')?.trim() || '';
        if (!this.vt(title)) return;
        recipes.push(make(title, href, this.fi($el)));
      });
    }

    else if (parser === 'tasty') {
      $('a[href*="/recipe/"]').each((_, el) => {
        if (recipes.length >= MAX) return false as any;
        const $el = $(el);
        const href = $el.attr('href') || '';
        const title = $el.find('h4,h3,[class*="recipe-name"]').first().text().trim()
          || $el.attr('aria-label')?.trim() || '';
        if (!this.vt(title)) return;
        const full = href.startsWith('http') ? href : `https://tasty.co${href}`;
        recipes.push(make(title, full, this.fi($el)));
      });
    }

    else if (parser === 'delish') {
      $('a[href*="delish.com"]').each((_, el) => {
        if (recipes.length >= MAX) return false as any;
        const $el = $(el);
        const href = $el.attr('href') || '';
        if (!href.match(/\/cooking\/recipe-ideas\/|\/recipes\//)) return;
        const title = $el.find('h3,h4,[class*="title"]').first().text().trim() || $el.attr('title')?.trim() || '';
        if (!this.vt(title)) return;
        const full = href.startsWith('http') ? href : `https://www.delish.com${href}`;
        recipes.push(make(title, full, this.fi($el)));
      });
    }

    else if (parser === 'seriouseats') {
      $('a[href*="seriouseats.com"]').each((_, el) => {
        if (recipes.length >= MAX) return false as any;
        const $el = $(el);
        const href = $el.attr('href') || '';
        if (!href.includes('/recipe') || href.includes('#')) return;
        const title = $el.find('[class*="card__title"],span,h3').first().text().trim()
          || $el.text().split('\n')[0].trim();
        if (!this.vt(title)) return;
        recipes.push(make(title, href, this.fi($el)));
      });
    }

    else if (parser === 'yummly') {
      $('[class*="RecipeCard"],[data-recipe-id],[class*="recipe-card"]').each((_, el) => {
        if (recipes.length >= MAX) return false as any;
        const $el = $(el);
        const title = $el.find('[class*="title"],[class*="name"],h4').first().text().trim();
        const href = $el.find('a').first().attr('href') || '';
        if (!this.vt(title) || !href) return;
        const full = href.startsWith('http') ? href : `https://www.yummly.com${href}`;
        recipes.push(make(title, full, this.fi($el)));
      });
    }

    else {
      // Generic: cookie-and-kate, minimalist-baker, love-and-lemons
      // The entry-title anchor IS the post title link — use it directly
      $('h2.entry-title a, h3.entry-title a, .post-title a, article h2 a, article h3 a').each((_, el) => {
        if (recipes.length >= MAX) return false as any;
        const $el = $(el);
        const href = $el.attr('href') || '';
        if (!href.startsWith('http') || href.includes('#')) return;
        const title = $el.text().trim().replace(/\s+/g, ' ');
        if (!this.vt(title)) return;
        // Find image in the nearest article/li wrapper
        const wrapper = $el.closest('article, .post, li, .hentry');
        const img = this.fi(wrapper.length ? wrapper : $el.parent().parent());
        recipes.push(make(title, href, img));
      });
    }

    return recipes.slice(0, MAX);
  }

  // ── Title validator — rejects article/roundup pages, only keeps individual recipe titles ──
  private vt(t: string): boolean {
    if (!t || t.length < 5 || t.length > 110) return false;
    if (/^\s*$/.test(t)) return false;

    // Block list articles / roundups — these link to a page of many recipes, not one recipe
    const articlePatterns = [
      /^\d+\s+(best|easy|quick|healthy|simple|delicious|amazing|vibrant|fresh|great|top|creative|favorite|tasty|vegan)/i,
      /^\d+\s+\w[\w\s]+\s+(recipes?|ideas?|ways?|dishes?|meals?|dinners?|lunches?)\b/i,
      /\b\d+\s+(recipes?|dishes?|meals?|ways?)\s+(to|for|with|featuring|using|made)\b/i,
      /\b(best|easy|quick)\s+\d+\s+(recipes?|ideas?)\b/i,
      /\b(collection|roundup|round.?up|compilation)\b/i,
      /\breview\b/i,
      /meets?\s+(fall|winter|summer|spring)\b/i,
      /^(seasonal|summer|winter|fall|spring|holiday)\s+(recipe|meal|menu)/i,
      /\bfor\s+the\s+seasonal\b/i,
    ];
    if (articlePatterns.some(p => p.test(t))) return false;

    return true;
  }
  private fi($el: cheerio.Cheerio<any>): string {
    return $el.find('img').attr('src') || $el.find('img').attr('data-src')
      || $el.find('img').attr('data-lazy-src') || $el.find('img').attr('data-original') || '';
  }

  // =================================================================
  // USER RECIPE CRUD — SSE events on delete/update
  // =================================================================
  async createMyRecipe(dto: CreateRecipeDto, userId: string, userName: string) {
    const isVeg = this.isVegetarian(dto.title, dto.ingredients || []);
    return this.recipeRepository.createUserRecipe({
      ...dto, isUserCreated: true,
      isVegetarian: dto.isVegetarian ?? isVeg,
      createdByUserId: userId, createdByName: userName, source: 'Community Recipe',
    });
  }

  async updateMyRecipe(id: string, dto: Partial<CreateRecipeDto>, userId: string) {
    const updates: any = { ...dto };
    if (dto.title || dto.ingredients) updates.isVegetarian = this.isVegetarian(dto.title || '', dto.ingredients || []);
    const updated = await this.recipeRepository.updateUserRecipe(id, userId, updates);
    if (updated) recipeEventBus.next({ type: 'updated', recipeId: id });
    return updated;
  }

  async deleteMyRecipe(id: string, userId: string) {
    const ok = await this.recipeRepository.deleteUserRecipe(id, userId);
    if (ok) recipeEventBus.next({ type: 'deleted', recipeId: id });
    return { success: ok };
  }

  async getMyRecipes(userId: string) {
    return (await this.recipeRepository.findByCreator(userId)).map(r => ({ ...r, _id: r._id?.toString() }));
  }

  // =================================================================
  // BOOKMARKS
  // =================================================================
  async saveRecipe(dto: CreateRecipeDto & { isUserCreated?: boolean }, userId?: string, userName?: string) {
    if (!userId) throw new Error('Login required');
    const isVeg = this.isVegetarian(dto.title, dto.ingredients || []);
    return this.recipeRepository.saveWebRecipe({ ...dto, isVegetarian: dto.isVegetarian ?? isVeg, createdByName: userName }, userId);
  }

  async unsaveRecipe(id: string, userId?: string) {
    if (!userId) throw new Error('Login required');
    try {
      const result = await this.recipeRepository.toggleBookmark(id, userId);
      if (!result.saved && (!result.recipe.savedByUserIds?.length) && !result.recipe.isUserCreated) {
        await this.recipeRepository.delete(id);
      }
      return result;
    } catch { await this.recipeRepository.delete(id); return { saved: false }; }
  }

  async getSavedRecipes(userId?: string) {
    if (!userId) return [];
    return (await this.recipeRepository.findBookmarkedByUser(userId)).map(r => ({
      ...r, _id: r._id?.toString(), isSaved: true, likes: r.savedByUserIds?.length ?? 0,
    }));
  }

  async likeRecipe(id: string) { return this.recipeRepository.findById(id); }
  async deleteSavedRecipe(id: string) { return this.recipeRepository.delete(id); }

  // ── Smart fallback image ──────────────────────────────────────────
  private getSmartImage(title: string, cuisine: string, idx: number): string {
    const t = `${title} ${cuisine}`.toLowerCase();
    const banks: Record<string, string[]> = {
      pasta: ['https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=600','https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600'],
      curry: ['https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600','https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600'],
      soup:  ['https://images.unsplash.com/photo-1547592180-85f173990554?w=600','https://images.unsplash.com/photo-1586417789929-6ec61e1dd7bc?w=600'],
      rice:  ['https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600','https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600'],
      salad: ['https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600','https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600'],
      egg:   ['https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600','https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600'],
    };
    for (const [key, imgs] of Object.entries(banks)) if (t.includes(key)) return imgs[idx % imgs.length];
    const g = ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600','https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600','https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600','https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600'];
    return g[Math.abs(idx) % g.length];
  }
}

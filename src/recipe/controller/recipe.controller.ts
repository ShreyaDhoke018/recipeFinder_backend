import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  HttpCode, HttpStatus, Headers, UnauthorizedException, Res, Sse
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Observable, map } from 'rxjs';
import type { Response } from 'express';
import { RecipeService, recipeEventBus } from '../service/recipe.service';
import { SearchRecipeDto, CreateRecipeDto } from '../dto/recipe.dto';
import { AuthService } from '../../auth/auth.service';

@ApiTags('recipes')
@Controller('recipes')
export class RecipeController {
  constructor(
    private readonly recipeService: RecipeService,
    private readonly authService: AuthService,
  ) {}

  private getUser(auth: string) {
    if (!auth?.startsWith('Bearer ')) return null;
    return this.authService.verifyToken(auth.slice(7));
  }
  private requireUser(auth: string) {
    const u = this.getUser(auth);
    if (!u) throw new UnauthorizedException('Login required');
    return u;
  }

  // ── SSE stream — broadcasts recipe events to all connected clients ──
  @Sse('events')
  events(): Observable<MessageEvent> {
    return recipeEventBus.pipe(
      map(event => ({ data: JSON.stringify(event) } as MessageEvent))
    );
  }

  // ── Search ────────────────────────────────────────────────────────
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Body() dto: SearchRecipeDto,
    @Query('page') page?: string,
    @Headers('authorization') auth?: string,
  ) {
    const user = this.getUser(auth || '');
    return this.recipeService.searchRecipes(dto, parseInt(page || '1', 10), user?.sub);
  }

  // ── Bookmarks ─────────────────────────────────────────────────────
  @Get('saved')
  async getSaved(@Headers('authorization') auth?: string) {
    const user = this.getUser(auth || '');
    return this.recipeService.getSavedRecipes(user?.sub);
  }

  @Post('save')
  async save(
    @Body() dto: CreateRecipeDto & { isUserCreated?: boolean },
    @Headers('authorization') auth = '',
  ) {
    const user = this.requireUser(auth);
    return this.recipeService.saveRecipe(dto, user.sub, user.name);
  }

  @Delete('saved/:id')
  @HttpCode(HttpStatus.OK)
  async unsave(@Param('id') id: string, @Headers('authorization') auth = '') {
    const user = this.requireUser(auth);
    return this.recipeService.unsaveRecipe(id, user.sub);
  }

  // ── My Recipes ────────────────────────────────────────────────────
  @Get('my')
  async getMyRecipes(@Headers('authorization') auth = '') {
    const user = this.requireUser(auth);
    return this.recipeService.getMyRecipes(user.sub);
  }

  @Post('my')
  async createMyRecipe(@Body() dto: CreateRecipeDto, @Headers('authorization') auth = '') {
    const user = this.requireUser(auth);
    return this.recipeService.createMyRecipe(dto, user.sub, user.name);
  }

  @Put('my/:id')
  async updateMyRecipe(
    @Param('id') id: string,
    @Body() dto: Partial<CreateRecipeDto>,
    @Headers('authorization') auth = '',
  ) {
    const user = this.requireUser(auth);
    return this.recipeService.updateMyRecipe(id, dto, user.sub);
  }

  @Delete('my/:id')
  @HttpCode(HttpStatus.OK)
  async deleteMyRecipe(@Param('id') id: string, @Headers('authorization') auth = '') {
    const user = this.requireUser(auth);
    return this.recipeService.deleteMyRecipe(id, user.sub);
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  async like(@Param('id') id: string) {
    return this.recipeService.likeRecipe(id);
  }
}

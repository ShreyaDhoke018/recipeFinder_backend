import { Injectable } from '@nestjs/common';

@Injectable()
export class IngredientsService {
  private readonly commonIngredients = [
    { name: 'Tomato', category: 'Vegetables', unit: 'pieces' },
    { name: 'Onion', category: 'Vegetables', unit: 'pieces' },
    { name: 'Garlic', category: 'Vegetables', unit: 'cloves' },
    { name: 'Chicken', category: 'Protein', unit: 'grams' },
    { name: 'Rice', category: 'Grains', unit: 'cups' },
    { name: 'Pasta', category: 'Grains', unit: 'grams' },
    { name: 'Eggs', category: 'Protein', unit: 'pieces' },
    { name: 'Cheese', category: 'Dairy', unit: 'grams' },
    { name: 'Milk', category: 'Dairy', unit: 'ml' },
    { name: 'Butter', category: 'Dairy', unit: 'grams' },
    { name: 'Olive Oil', category: 'Oils', unit: 'tbsp' },
    { name: 'Salt', category: 'Spices', unit: 'tsp' },
    { name: 'Pepper', category: 'Spices', unit: 'tsp' },
    { name: 'Carrot', category: 'Vegetables', unit: 'pieces' },
    { name: 'Potato', category: 'Vegetables', unit: 'pieces' },
    { name: 'Spinach', category: 'Vegetables', unit: 'cups' },
    { name: 'Lemon', category: 'Fruits', unit: 'pieces' },
    { name: 'Flour', category: 'Grains', unit: 'cups' },
    { name: 'Sugar', category: 'Sweeteners', unit: 'cups' },
    { name: 'Mushroom', category: 'Vegetables', unit: 'grams' },
    { name: 'Bell Pepper', category: 'Vegetables', unit: 'pieces' },
    { name: 'Broccoli', category: 'Vegetables', unit: 'cups' },
    { name: 'Salmon', category: 'Protein', unit: 'grams' },
    { name: 'Beef', category: 'Protein', unit: 'grams' },
    { name: 'Tofu', category: 'Protein', unit: 'grams' },
  ];

  async getCommonIngredients() {
    return this.commonIngredients;
  }

  async searchIngredients(query: string) {
    if (!query) return this.commonIngredients;
    return this.commonIngredients.filter(i =>
      i.name.toLowerCase().includes(query.toLowerCase())
    );
  }
}

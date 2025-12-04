import React from 'react';

const SourdoughRecipes: React.FC = () => {
  const recipes = [
    {
      id: 1,
      title: "Sourdough Bread",
      description: "A classic sourdough loaf  with rolled oats & chia seeds.",
      ingredients: [
        "3 cups bread flour",
        "1 1/2 cups warm water",
        "1/2 cup rolled oats",
        "1/4 cup chia seeds",
        "1/2 cup active sourdough starter",
        "1 teaspoon salt"
      ],
      instructions: "Mix starter, warm water, rolled oats, & chia sees.  Then mix in flour.  Let sit for 30 minutes, then add salt and knead in a stand mixer.  After kneading, move the dough into a slightly oiled bowl and let ferment overnight in the fridge.  After fermenting, shape and place in a proof basket with a wet paper towel for a few hours.  Heat the oven to 450°F with the Römertopf inside.  Once preheating is done, remove the Römertopf, score the loaf, and place it on some parchment paper in the Römertopf.  Bake covered for 30 minutes and then uncovered for another 30 minutes.  Let cool for at least an hour on a wire rack before slicing to allow the crust of crumb.<br>If you don't want to add the rolled oats and chia seeds, you will only need 1 cup of water.<br>If you don't have a Römertopf, what are you even doing reading this recipe?"
    },
    {
      id: 2,
      title: "Sourdough pancakes",
      description: "Fluffy sourdough pancakes with tangy flavor",
      ingredients: [
        "1 cup active sourdough starter (fed and bubbly)",
        "1 cup bread flour",
        "1 tablespoon sugar",
        "1 teaspoon baking powder",
        "1/2 teaspoon baking soda",
        "1/2 teaspoon salt",
        "1 large egg",
        "1 1/2 cups buttermilk (or 1 1/2 cups milk mixed with 1 1/2 tablespoons lemon juice or vinegar, left to sit for 5 minutes)",
        "2 tablespoons melted butter"
      ],
      instructions: "In a large bowl, whisk together the flour, sugar, baking powder, baking soda, and salt.<br>In a separate bowl, mix the sourdough starter, egg, and buttermilk. Add the melted butter and mix well.<br>Pour the wet ingredients into the dry ingredients and stir until just combined. Some small lumps are okay. Let the batter rest for 10 minutes.<br>Heat a lightly oiled griddle or frying pan over medium heat. For each pancake, pour 1/4 cup of batter onto the griddle. Cook until bubbles form on the surface, about 2-3 minutes.<br>Flip the pancakes and cook until golden brown on the other side, about 1-2 minutes more."
    },
    {
      id: 3,
      title: "Sourdough Chocolate Chip Cookies",
      description: "Tangy chocolate chip cookies without eggs.",
      ingredients: [
        "1 cup active sourdough starter",
        "2 1/4 cups all-purpose flour",
        "1 teaspoon baking soda",
        "1 teaspoon salt",
        "1 cup unsalted butter, softened",
        "3/4 cup granulated sugar",
        "3/4 cup packed brown sugar",
        "1 teaspoon vanilla extract",
        "1 1/2 cups chocolate chips"
      ],
      instructions: "Preheat the oven to 375°F and line baking sheets with parchment paper.<br>whisk together the flour, baking soda, and salt.<br>In another bowl, cream together the softened butter, granulated sugar, and brown sugar until light and fluffy, about 2-3 minutes.<br>Stir in the sourdough starter and vanilla extract until well combined.<br>Gradually add the dry ingredients to the wet ingredients, mixing just until combined. Fold in the chocolate chips.<br>Drop rounded tablespoons of dough onto the prepared baking sheets, spacing them about 2 inches apart.<br>Bake for 9-11 minutes, or until the edges are lightly golden. The centers may still look soft, but they will firm up as they cool.<br>Allow the cookies to cool on the baking sheet for 5 minutes before transferring them to a wire rack to cool completely."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Sourdough Recipes
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Discover the art of sourdough baking with these tried and true recipes
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {recipe.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {recipe.description}
              </p>

              <div className="mb-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Ingredients:</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0"></span>
                      {ingredient}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Instructions:</h3>
                <div className="text-sm text-gray-600 dark:text-gray-400" dangerouslySetInnerHTML={{ __html: recipe.instructions }} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Baking Tips
            </h3>
            <ul className="text-blue-800 dark:text-blue-200 space-y-1 text-sm">
              <li>• Always use active, bubbly starter for best results</li>
              <li>• Temperature affects fermentation time - warmer = faster</li>
              <li>• Steam in the oven creates a better crust</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourdoughRecipes;

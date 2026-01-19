import React from 'react';

const SourdoughRecipes: React.FC = () => {
  const recipes = [
    {
      id: 1,
      title: "Bread",
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
      title: "Pancakes",
      description: "Fluffy sourdough pancakes with tangy flavor.",
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
      title: "Chocolate Chip Cookies",
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
    },
    {
      id: 4,
      title: "Hamburger Buns",
      description: "Tangy sourdough hamburger buns perfect for burgers and sandwiches.",
      ingredients: [
        "For the Starter:",
        "25 grams (2 tablespoons) active sourdough starter",
        "50 grams (1/4 cup) warm water",
        "50 grams (1/3 cup) all-purpose flour",
        "For the Dough:",
        "175 grams (3/4 cup) warm water",
        "250 grams (2 cups) bread flour",
        "25 grams (2 tablespoons) whole wheat flour",
        "5 grams (3/4 teaspoon) salt",
        "12 grams (1 tablespoon) granulated sugar",
        "25 grams (2 tablespoons) unsalted butter, softened",
        "1 large egg",
        "All of the starter",
        "For Topping (Optional):",
        "1/2 large egg, beaten with 1/2 tablespoon of milk or water",
        "Sesame seeds or poppy seeds"
      ],
      instructions: "<strong>1. Make the Leaven:</strong> In a small bowl, combine the active sourdough starter, warm water, and all-purpose flour for the levain. Mix until smooth and cover loosely. Let it sit at room temperature for 4-6 hours, or until it has doubled in size and is bubbly and active.<br><br><strong>2. Mix the Dough:</strong> In the bowl of a stand mixer fitted with a dough hook, combine the 175 grams of warm water and the entire levain. Mix briefly to break up the levain. Add the bread flour, whole wheat flour, salt, and sugar. Mix on low speed until a shaggy dough forms. Increase the speed to medium and knead for 5-7 minutes until the dough starts to come together and become smooth.<br><br><strong>3. Incorporate Butter and Egg:</strong> Add the softened butter and the large egg to the dough. Continue to knead on medium speed for another 5-8 minutes. The dough is ready when it passes the windowpane test (you can stretch a small piece of dough thin enough to see light through it) and pulls away from the sides of the bowl. It should be soft, smooth, and slightly tacky.<br><br><strong>4. Bulk Fermentation:</strong> Place the dough in a lightly greased bowl, cover it, and let it rise at room temperature for 4-6 hours. The dough should rise by about 75-80%, not necessarily double in size. To help develop strength, you can perform a set of stretches and folds once during the first hour of rising.<br><br><strong>5. Divide and Shape:</strong> Turn the dough out onto a lightly floured work surface. Gently degass it and divide it into 4 equal pieces (each will be about 130-140 grams). To shape each bun, take a piece of dough and create a tight, smooth ball by cupping your hand over it and moving it in a circular motion on the work surface.<br><br><strong>6. Second Proof (Proofing):</strong> Place the shaped dough balls onto a baking sheet lined with parchment paper. Press them down gently to flatten them slightly into a disc shape. Cover loosely with plastic wrap or a damp towel and let them proof for 2-3 hours at room temperature. They should look puffy and have risen noticeably, but not doubled.<br><br><strong>7. Preheat Oven:</strong> About 30 minutes before the end of the proofing time, preheat your oven to 400°F (200°C).<br><br><strong>8. Prepare for Baking:</strong> Brush the tops of the proofed buns with the egg wash (beaten egg and milk/water). Sprinkle generously with sesame or poppy seeds if desired.<br><br><strong>9. Bake:</strong> Place the baking sheet in the preheated oven and bake for 18-22 minutes. The buns are done when they are a deep golden brown and their internal temperature reaches 190-200°F (88-93°C).<br><br><strong>10. Cool:</strong> Remove the buns from the oven and let them cool on the baking sheet for a few minutes before transferring them to a wire rack to cool completely."
    },
    {
      id: 5,
      title: "Chocolate Bread",
      description: "Rich chocolate bread with complex sourdough tang and gooey chocolate pockets.",
      ingredients: [
        "For the Leaven:",
        "50g active sourdough starter",
        "100g water",
        "100g all-purpose or bread flour",
        "For the Final Dough:",
        "700g bread flour",
        "50g unsweetened cocoa powder",
        "550g water (adjust as needed)",
        "10g fine sea salt",
        "10g sugar (optional)",
        "150g dark chocolate chunks or chips"
      ],
      instructions: "<strong>1. Make the Leaven:</strong> The night before, mix your 50g starter with the 100g water and 100g flour. Let it sit until it's bubbly, active, and has doubled in size.<br><br><strong>2. Mix the Dough:</strong> In a large bowl, whisk together the 700g flour and 50g cocoa powder. Add the 550g water and all of your active leaven. Mix until no dry bits remain. Let this rest for 30-60 minutes (autolyse).<br><br><strong>3. Add Salt & Sugar:</strong> After the autolyse, sprinkle the salt and optional sugar over the dough. Use wet hands to squeeze and fold it in until fully incorporated.<br><br><strong>4. Bulk Fermentation:</strong> Perform a set of stretch and folds every 30 minutes for the first 2-3 hours. During the last set of folds, gently fold in the chocolate chunks. Cover the dough and let it complete its bulk fermentation, which can take another 3-5 hours. The dough is ready when it's puffy, jiggly, and has risen by about 50-75%.<br><br><strong>5. Shape & Cold Proof:</strong> Gently turn the dough out onto a lightly floured surface, shape it into a round or oval, and place it seam-side up into a well-floured banneton. Cover it and place it in the refrigerator for 12-18 hours.<br><br><strong>6. Bake:</strong> Preheat your Dutch oven in a 500°F (260°C) oven. Turn the dough out onto parchment paper, score it, and carefully place it into the hot Dutch oven. Bake with the lid on for 20-25 minutes, then remove the lid and bake for another 20-25 minutes until deep, dark, and the internal temperature is around 205-210°F (96-99°C).<br><br>The result is a delicious, rich bread with a complex flavor profile that is perfect for toast, French toast, or just eating on its own with a slather of butter."
    },
    {
      id: 6,
      title: "Bagels",
      description: "Chewy and flavorful sourdough bagels with a tangy twist.",
      ingredients: [
        "For the Levain",
        "100g active sourdough starter (100% hydration)",
        "100g bread flour",
        "100g warm water (approximately 80°F / 27°C)",
        "For the Dough",
        "450g bread flour",
        "175g warm water",
        "20g honey or malt syrup",
        "10g salt",
        "For the Water Bath",
        "2 quarts water",
        "1 tablespoon barley malt syrup or baking soda",
        "1 tablespoon sugar (optional)",
        "Toppings Sesame seeds, poppy seeds, everything bagel seasoning, or coarse salt"
      ],
      instructions: "<strong>1. Make the Levain</strong><br>The evening before baking, mix the starter, flour, and water in a small bowl. Cover and let sit at room temperature for 8-12 hours, or until doubled in size and bubbly.<br><br><strong>2. Mix the Dough</strong><br><ol><li>In the bowl of a stand mixer fitted with the dough hook attachment, combine the levain, warm water, and honey or malt syrup. Mix until dissolved.</li><li>Add the flour and salt to the bowl.</li><li>Mix on low speed for 2-3 minutes until the dough comes together. It should be shaggy and tacky.</li><li>Increase the speed to medium and knead for 5-7 minutes until the dough is smooth and elastic. It should pass the windowpane test.</li></ol><br><strong>3. Bulk Fermentation</strong><br><ol><li>Place the dough in a lightly greased bowl, cover with plastic wrap, and let rise in a warm spot for 1.5 to 2 hours, or until the dough has increased by roughly 50%.</li><li>Perform a set of stretch and folds at the 30-minute mark to strengthen the gluten structure.</li></ol><br><strong>4. Shape</strong><br><ol><li>Divide the dough into 8 equal pieces (approximately 100g each).</li><li>Pre-shape each piece into a tight ball by tucking the edges underneath. Let rest for 15 minutes, covered.</li><li>To form the bagel shape, poke a hole through the center of each ball with your thumb. Gently stretch the hole to widen it to about 2 inches in diameter. Alternatively, roll the dough into a rope and pinch the ends together to form a ring.</li></ol><br><strong>5. Proof</strong><br>Place the shaped bagels on a parchment-lined baking sheet dusted with cornmeal. Cover lightly with plastic wrap and let proof for 30 to 45 minutes. They should look slightly puffy.<br><br><strong>6. Prepare the Water Bath</strong><br>Preheat your oven to 425°F (220°C). While the oven heats, bring the water, malt syrup (or baking soda), and sugar to a boil in a large pot.<br><br><strong>7. Boil the Bagels</strong><br><ol><li>Gently drop 2-3 bagels into the boiling water. Do not overcrowd the pot.</li><li>Boil for 1 minute on each side (2 minutes total).</li><li>Remove with a slotted spoon, shaking off excess water, and place back on the baking sheet.</li><li>Immediately sprinkle with your desired toppings while the bagels are still wet.</li></ol><br><strong>8. Bake</strong><br><ol><li>Transfer the baking sheet to the preheated oven.</li><li>Bake for 20-25 minutes, or until the bagels are deeply golden brown.</li><li>Rotate the pan halfway through baking to ensure even browning.</li></ol><br><strong>9. Cool</strong><br>Let the bagels cool on a wire rack for at least 20 minutes before slicing to allow the crumb to set properly."
    },

    {
      id: 7,
      title: "Pretzels",
      description: "Chewy sourdough pretzels with a tangy flavor and golden crust.",
      ingredients: [
        "For the Dough:",
        "100g active sourdough starter (100% hydration)",
        "240g warm water (approx. 80°F/27°C)",
        "400g all-purpose flour or bread flour",
        "10g sugar or honey",
        "10g salt (fine sea salt is best)",
        "For the Baking Soda Bath:",
        "4 cups water",
        "2 tablespoons baking soda",
        "For Topping:",
        "Coarse sea salt (pretzel salt)",
        "1 egg (for egg wash, optional)"
      ],
      instructions: "<strong>1. Prepare the Dough</strong><br>In a large mixing bowl, combine the <strong>warm water</strong> and <strong>sugar</strong>. Stir until dissolved. Add the <strong>active sourdough starter</strong> and mix well to incorporate. Gradually add the <strong>flour</strong> and <strong>salt</strong>, mixing until a shaggy dough forms.<br><br><strong>2. Knead the dough</strong> on a lightly floured surface for about 5–10 minutes until it becomes smooth and elastic. Alternatively, you can use a stand mixer with a dough hook for 5–7 minutes.<br><br><strong>3. Bulk Fermentation</strong><br>Place the dough in a lightly oiled bowl, turning it once to coat all sides. Cover with plastic wrap or a damp towel. Let it rise at room temperature for <strong>3–5 hours</strong>, or until it has roughly doubled in size. The timing will depend on the temperature of your room and the activity of your starter. For a slower fermentation with more flavor development, you can place the dough in the refrigerator overnight.<br><br><strong>4. Shape the Pretzels</strong><br>Once the dough has risen, turn it out onto a lightly floured surface. Divide the dough into <strong>6–8 equal pieces</strong>, depending on how large you want your pretzels.<br>Cover them loosely and let them rest for <strong>15–20 minutes</strong> while you preheat the oven and prepare the water bath.<br><br><strong>5. Prepare the Baking Soda Bath</strong><br>Preheat your oven to <strong>425°F (220°C)</strong>. Line a baking sheet with parchment paper.<br><br>In a large pot, bring the <strong>4 cups of water</strong> to a boil. Add the <strong>2 tablespoons of baking soda</strong> (be careful, as it will bubble up). Reduce the heat to a gentle simmer.<br><br><strong>6. Boil the Pretzels</strong><br>Working with one or two pretzels at a time, carefully lower them into the simmering water. Boil for about <strong>20–30 seconds per side</strong>. Use a slotted spoon to flip them and remove them from the water. Place them back on the parchment-lined baking sheet.<br><br>If desired, whisk the egg with a tablespoon of water and brush the tops of the pretzels with the <strong>egg wash</strong>. This helps the salt stick and gives them a shiny finish. Sprinkle generously with <strong>coarse sea salt</strong>.<br><br><strong>7. Bake</strong><br>Bake the pretzels in the preheated oven for <strong>12–15 minutes</strong>, or until they are a deep golden brown. Rotate the baking sheet halfway through to ensure even browning.<br><br><strong>8. Cool and Serve</strong><br>Remove the pretzels from the oven and let them cool on a wire rack for a few minutes. They are best enjoyed warm."
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
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {recipe.ingredients.map((ingredient, index) => {
                    if (ingredient.startsWith("For the") || ingredient.endsWith(":")) {
                      return <div key={index} className="font-semibold mt-2">{ingredient}</div>;
                    } else {
                      return <div key={index} className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0"></span>
                        {ingredient}
                      </div>;
                    }
                  })}
                </div>
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

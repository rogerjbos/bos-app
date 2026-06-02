import React, { useState } from 'react';

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
  },
  {
    id: 8,
    title: "Trini Fried Bake",
    description: "This sourdough version adds a tangy complexity to the classic Trini fry bake while maintaining its characteristic fluffy interior and slightly crisp exterior.",
    ingredients: [
      "1 cup active sourdough starte",
      "2 cups all-purpose flour",
      "1/2 cup whole wheat flour",
      "1 teaspoon baking soda",
      "1 teaspoon salt",
      "1-2 tablespoons honey (optional)",
      "1/2 cup warm water",
      "Oil for frying"
    ],
    instructions: "<br><strong>1. Prepare the Dough</strong><br>Prepare the dough: In a large mixing bowl, combine the active sourdough starter with the warm water. Mix well until the starter is fully dissolved.<br><br><strong>2. Add dry ingredients:</strong><br>Gradually add the all-purpose flour, whole wheat flour, baking soda, and salt to the wet mixture. If using honey for a touch of sweetness, add it now.1 Mix until a soft, pliable dough forms.<br><br><strong>3. Knead the dough:</strong><br>Turn the dough onto a lightly floured surface and knead for 5-7 minutes until smooth and elastic. The dough should be thick but flattish, as characteristic of Trini fry bakes.<br><br><strong>4. Rest the dough:</strong><br>Cover the dough with a damp cloth and let it rest for 30-60 minutes at room temperature. This allows the sourdough to develop its characteristic flavor.<br><br><strong>5. Shape the bakes:</strong><br>Divide the dough into 6-8 equal portions. Roll each portion into a ball, then flatten slightly with your hands to create circular patties about 1/2 inch thick.<br><br><strong>6. Heat the oil:</strong><br>In a heavy-bottomed skillet or frying pan, heat about 1-2 inches of oil to medium-high heat (350-375°F or 175-190°C).<br><br><strong>7. Fry the bakes:</strong><br>Carefully place the flattened dough pieces into the hot oil, being careful not to overcrowd the pan. Fry for 2-3 minutes on each side until golden brown and puffed up.<br><br><strong>8. Drain and serve:</strong><br>Remove the fried bakes from the oil and drain on paper towels. Serve warm, either plain or with your favorite toppings."
  },
  {
    id: 9,
    title: "Homemade Granola",
    description: "A simple, crunchy homemade granola with almonds, raisins, and honey.",
    ingredients: [
      "3 cups rolled oats",
      "1 cup almonds, roughly chopped",
      "1 cup raisins",
      "1/2 cup honey",
      "1/4 cup vegetable oil or melted coconut oil",
      "1 teaspoon vanilla extract",
      "1/2 teaspoon salt",
      "1 teaspoon cinnamon"
    ],
    instructions: "<strong>1. Preheat:</strong> Preheat your oven to 300°F (150°C) and line a baking sheet with parchment paper.<br><br><strong>2. Mix dry ingredients:</strong> In a large bowl, combine the rolled oats, chopped almonds, and salt.<br><br><strong>3. Mix liquids:</strong> In a separate bowl, whisk together the honey, oil, and vanilla extract.<br><br><strong>4. Combine:</strong> Pour the honey mixture over the oat mixture and stir until everything is evenly coated.<br><br><strong>5. Bake:</strong> Spread the granola mixture onto the prepared baking sheet in an even layer.  Bake for 20-25 minutes, stirring halfway through, until golden brown.<br><br><strong>6. Cool:</strong> Remove from the oven and let it cool completely. The granola will crisp up as it cools.<br><br>Once cooled, stir in the raisins.<br><br>Store in an airtight container at room temperature for up to 2 weeks."
  },
  {
    id: 10,
    title: "Cinnamon Buns",
    description: "Rich cinnamon buns combining the complex tang of sourdough with sweet cinnamon filling and vanilla glaze.",
    ingredients: [
      "For the Dough:",
      "1 cup active sourdough starter (fed and bubbly)",
      "1 cup warm milk (around 110°F/43°C)",
      "1/2 cup granulated sugar",
      "1/3 cup unsalted butter, melted",
      "2 large eggs",
      "4 cups all-purpose flour",
      "1 teaspoon salt",
      "1 teaspoon ground cinnamon",
      "For the Filling:",
      "1/2 cup brown sugar, packed",
      "2 tablespoons ground cinnamon",
      "1/4 cup unsalted butter, softened",
      "For the Glaze:",
      "1 cup powdered sugar",
      "2-4 tablespoons milk or cream",
      "1/2 teaspoon vanilla extract"
    ],
    instructions: "<strong>1. Prepare the dough:</strong> In a large mixing bowl, combine the active sourdough starter, warm milk, granulated sugar, melted butter, and eggs. Mix until well combined.<br><br><strong>2. Add dry ingredients:</strong> Gradually add the flour, salt, and 1 teaspoon of cinnamon to the wet ingredients. Mix until a soft dough forms.<br><br><strong>3. Knead the dough:</strong> Turn the dough onto a floured surface and knead for 8-10 minutes until smooth and elastic. Place in a greased bowl, cover, and let rise for 4-6 hours at room temperature or overnight in the refrigerator for a more developed flavor.<br><br><strong>4. Prepare the filling:</strong> In a small bowl, mix together the brown sugar and 2 tablespoons of cinnamon for the filling.<br><br><strong>5. Roll and fill:</strong> Roll out the dough into a 12×16 inch rectangle. Spread the softened butter evenly over the dough, then sprinkle the cinnamon sugar mixture over the butter.<br><br><strong>6. Form the rolls:</strong> Starting from the long side, tightly roll the dough into a log. Using a sharp knife or dental floss, cut the log into 12 equal pieces.<br><br><strong>7. Second rise:</strong> Place the rolls in a greased 9×13 inch baking pan, leaving space between them. Cover and let rise for 1-2 hours until puffy.<br><br><strong>8. Bake:</strong> Preheat oven to 375°F (190°C). Bake the cinnamon buns for 20-25 minutes until golden brown.<br><br><strong>9. Make the glaze:</strong> While the rolls are baking, whisk together the powdered sugar, milk or cream, and vanilla extract until smooth.<br><br><strong>10. Finish:</strong> Let the rolls cool for about 10 minutes, then drizzle with the glaze before serving.<br><br>These sourdough cinnamon buns have a slightly tangy flavor that perfectly balances the sweetness of the filling and glaze. The longer fermentation time not only develops flavor but also makes them easier to digest."
  },
  {
    id: 11,
    title: "Croissants",
    description: "Buttery, flaky sourdough croissants with complex fermented flavor. A two-day process for proper fermentation and lamination.",
    ingredients: [
      "For the Levain:",
      "25g active sourdough starter (100% hydration)",
      "75g all-purpose flour",
      "75g water",
      "For the Dough:",
      "300g all-purpose flour",
      "50g sugar",
      "10g salt",
      "150g whole milk (cold)",
      "75g unsalted butter (melted and cooled)",
      "All of the levain (from above)",
      "For the Butter Block:",
      "200g high-quality European-style butter (cold)",
      "For the Egg Wash:",
      "1 egg",
      "1 tablespoon milk"
    ],
    instructions: "<strong>Day 1: Prepare the Levain and Dough</strong><br><br><strong>1. Make the Levain:</strong> In a small bowl, mix the sourdough starter, flour, and water until well combined. Cover and let sit at room temperature for 4-6 hours, or until doubled in size and bubbly.<br><br><strong>2. Mix the Dough:</strong> In a stand mixer with a dough hook, combine flour, sugar, and salt. Add the cold milk, melted butter, and the prepared levain. Mix on low speed until a shaggy dough forms, then increase to medium speed and knead for 5-7 minutes until smooth. The dough should be soft but not sticky.<br><br><strong>3. First Fermentation:</strong> Shape the dough into a rectangle, place in a lightly oiled container, cover, and refrigerate overnight (at least 8 hours).<br><br><strong>Day 2: Lamination and Shaping</strong><br><br><strong>4. Prepare the Butter Block:</strong> Place the cold butter between two sheets of parchment paper. Using a rolling pin, pound and roll the butter into a 7-inch (18cm) square. Refrigerate while you prepare the dough.<br><br><strong>5. Laminate the Dough:</strong> Roll the chilled dough into a 10-inch (25cm) square on a lightly floured surface. Place the butter block diagonally in the center of the dough square. Fold the corners of the dough over the butter to encase it completely, pinching seams to seal. Roll the dough into a rectangle approximately 8×16 inches (20×40cm).<br><br><strong>6. First Turn (Letter Fold):</strong> Fold the bottom third of the dough up, then the top third down, like folding a letter. Wrap in plastic and refrigerate for 45 minutes.<br><br><strong>7. Second Turn (Letter Fold):</strong> Rotate the dough 90 degrees, roll out again to 8×16 inches (20×40cm). Perform another letter fold. Wrap and refrigerate for another 45 minutes.<br><br><strong>8. Third Turn (Letter Fold):</strong> Rotate the dough 90 degrees, roll out again to 8×16 inches (20×40cm). Perform a final letter fold. Wrap and refrigerate for at least 2 hours or overnight.<br><br><strong>9. Shape the Croissants:</strong> Roll the dough into a long rectangle approximately 6×20 inches (15×50cm). Cut triangles with a 4-inch (10cm) base. Make a small notch at the base of each triangle. Gently stretch each triangle and roll from the base to the tip, curving slightly into a crescent shape. Place on baking sheets lined with parchment paper.<br><br><strong>10. Final Proof:</strong> Cover loosely with plastic and let proof at room temperature for 2-3 hours, or until noticeably puffy but not doubled.<br><br><strong>Baking</strong><br><br><strong>11. Preheat and Prepare:</strong> Preheat oven to 400°F (200°C). Mix the egg and milk for the egg wash.<br><br><strong>12. Bake:</strong> Gently brush each croissant with egg wash, avoiding the edges to prevent sealing the layers. Bake for 15-20 minutes, rotating halfway through, until deep golden brown. Cool on a wire rack for at least 10 minutes before serving.<br><br><strong>Tips for Success:</strong> Keep everything cold during lamination to maintain distinct butter layers. Use high-butterfat European-style butter for best flavor and texture. Don't skip the resting periods between turns - this allows the gluten to relax. For extra flaky croissants, you can add a fourth turn to the lamination process."
  },
  {
    id: 12,
    title: "Banana Bread",
    description: "Moist, flavorful banana bread using sourdough discard with a subtle tang that complements ripe bananas.",
    ingredients: [
      "1 cup (240g) active sourdough starter (fed and bubbly)",
      "3-4 very ripe bananas, mashed (about 1½ cups)",
      "½ cup (113g) unsalted butter, melted",
      "½ cup (100g) granulated sugar",
      "¼ cup (50g) brown sugar",
      "2 large eggs",
      "1 tsp vanilla extract",
      "1½ cups (180g) all-purpose flour",
      "½ tsp baking soda",
      "½ tsp salt",
      "½ tsp cinnamon",
      "¼ tsp nutmeg",
      "Optional: ½ cup chopped nuts or chocolate chips"
    ],
    instructions: "<strong>1. Preheat:</strong> Preheat your oven to 350°F (175°C). Grease a 9×5 inch loaf pan and line with parchment paper.<br><br><strong>2. Combine starter and bananas:</strong> In a large bowl, combine the active sourdough starter and mashed bananas. Mix well.<br><br><strong>3. Add wet ingredients:</strong> Add melted butter, granulated sugar, brown sugar, eggs, and vanilla extract. Beat until well combined.<br><br><strong>4. Mix dry ingredients:</strong> In a separate bowl, whisk together the flour, baking soda, salt, cinnamon, and nutmeg.<br><br><strong>5. Combine:</strong> Gradually add the dry ingredients to the wet ingredients, mixing just until combined. Don't overmix.<br><br><strong>6. Add mix-ins:</strong> If using, fold in nuts or chocolate chips.<br><br><strong>7. Pan the batter:</strong> Pour the batter into the prepared loaf pan and smooth the top.<br><br><strong>8. Bake:</strong> Bake for 50-60 minutes, or until a toothpick inserted into the center comes out clean.<br><br><strong>9. Cool:</strong> Let cool in the pan for 10 minutes before removing to a wire rack to cool completely.<br><br>This banana bread will have a slightly denser texture and subtle tang from the sourdough. The longer you let it sit (a day or two), the more the flavors will develop."
  }
];

type Recipe = typeof recipes[number];

const SourdoughRecipes: React.FC = () => {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe>(recipes[0]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Sourdough Recipes
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Discover the art of sourdough baking with these tried and true recipes
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Recipe list sidebar */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="lg:sticky lg:top-8 space-y-3 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2">
              {recipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => setSelectedRecipe(recipe)}
                  className={`w-full text-left rounded-lg p-4 transition-all duration-200 border-2 ${
                    selectedRecipe.id === recipe.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 shadow-md'
                      : 'bg-white dark:bg-gray-800 border-transparent hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                  }`}
                >
                  <h3 className={`font-semibold text-base ${
                    selectedRecipe.id === recipe.id
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {recipe.title}
                  </h3>
                  <p className={`text-sm mt-1 line-clamp-2 ${
                    selectedRecipe.id === recipe.id
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {recipe.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Recipe detail panel */}
          <div className="flex-1 min-w-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sm:p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {selectedRecipe.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
                {selectedRecipe.description}
              </p>

              <div className="grid md:grid-cols-[auto_1fr] gap-8">
                {/* Ingredients */}
                <div className="md:w-72">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
                    Ingredients
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
                    {selectedRecipe.ingredients.map((ingredient, index) => {
                      if (ingredient.startsWith("For the") || ingredient.startsWith("For Topping") || ingredient.startsWith("Toppings") || ingredient.endsWith(":")) {
                        return (
                          <div key={index} className="font-semibold text-gray-800 dark:text-gray-200 mt-3 first:mt-0">
                            {ingredient}
                          </div>
                        );
                      }
                      return (
                        <div key={index} className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                          <span>{ingredient}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Instructions */}
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
                    Instructions
                  </h3>
                  <div
                    className="text-gray-600 dark:text-gray-400 leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedRecipe.instructions }}
                  />
                </div>
              </div>
            </div>

            {/* Baking Tips */}
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
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
    </div>
  );
};

export default SourdoughRecipes;

package com.movefuel.mufil2.domain.meal

import org.junit.Assert.assertEquals
import org.junit.Test

class MealNutritionMathTest {
    @Test
    fun scalesNutrientsProportionallyToNewGrams() {
        assertEquals(200, scaleNutrientForGrams(value = 100, currentGrams = 100, newGrams = 200))
        assertEquals(50, scaleNutrientForGrams(value = 100, currentGrams = 200, newGrams = 100))
    }

    @Test
    fun nonPositiveValuesStayZeroAndZeroGramsNeverDivideByZero() {
        assertEquals(0, scaleNutrientForGrams(value = 0, currentGrams = 100, newGrams = 250))
        assertEquals(0, scaleNutrientForGrams(value = -10, currentGrams = 100, newGrams = 250))
        assertEquals(100, scaleNutrientForGrams(value = 100, currentGrams = 0, newGrams = 1))
    }
}

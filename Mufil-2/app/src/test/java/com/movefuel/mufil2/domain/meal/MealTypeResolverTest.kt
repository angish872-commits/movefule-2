package com.movefuel.mufil2.domain.meal

import org.junit.Assert.assertEquals
import org.junit.Test

class MealTypeResolverTest {
    @Test
    fun suggestsCommonMealPeriods() {
        assertEquals("breakfast", MealTypeResolver.suggest(8))
        assertEquals("lunch", MealTypeResolver.suggest(13))
        assertEquals("dinner", MealTypeResolver.suggest(19))
        assertEquals("snack", MealTypeResolver.suggest(23))
    }

    @Test
    fun normalizesOnlySupportedBackendValues() {
        assertEquals("lunch", MealTypeResolver.normalize(" Lunch "))
        assertEquals("other", MealTypeResolver.normalize("brunch"))
        assertEquals("Dinner", MealTypeResolver.displayName("dinner"))
    }
}

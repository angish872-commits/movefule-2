package com.movefuel.mufil2.domain.meal

import kotlin.math.roundToInt

/** Provisional gram-scaling math for meal drafts, ported from old SRC-001 `MealNutritionMath`. */
fun scaleNutrientForGrams(
    value: Int,
    currentGrams: Int,
    newGrams: Int,
): Int {
    if (value <= 0) return 0
    val base = currentGrams.coerceAtLeast(1)
    val target = newGrams.coerceAtLeast(1)
    return (value.toDouble() * target.toDouble() / base.toDouble()).roundToInt().coerceAtLeast(0)
}

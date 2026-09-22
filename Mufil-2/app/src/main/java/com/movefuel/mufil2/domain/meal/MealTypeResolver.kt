package com.movefuel.mufil2.domain.meal

/**
 * Suggests a meal label from local wall-clock time only as a convenience.
 * The suggestion is always editable by the user before confirmation.
 */
object MealTypeResolver {
    val allowedTypes: List<String> = listOf("breakfast", "lunch", "dinner", "snack", "other")

    fun suggest(localHour: Int): String = when (localHour.coerceIn(0, 23)) {
        in 5..10 -> "breakfast"
        in 11..15 -> "lunch"
        in 16..21 -> "dinner"
        else -> "snack"
    }

    fun normalize(value: String?): String = value
        ?.trim()
        ?.lowercase()
        ?.takeIf { it in allowedTypes }
        ?: "other"

    fun displayName(value: String): String = when (normalize(value)) {
        "breakfast" -> "Breakfast"
        "lunch" -> "Lunch"
        "dinner" -> "Dinner"
        "snack" -> "Snack"
        else -> "Other"
    }
}

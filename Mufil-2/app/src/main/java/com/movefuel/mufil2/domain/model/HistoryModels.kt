package com.movefuel.mufil2.domain.model

/** Confirmed meal history row, ported from old SRC-001 product models. */
data class MealHistoryEntry(
    val id: String,
    val title: String,
    val mealType: String,
    val grams: Int,
    val calories: Int,
    val proteinGrams: Int,
    val carbohydratesGrams: Int,
    val fatGrams: Int,
    val fiberGrams: Int,
    val localDate: String,
    val confirmed: Boolean = true,
    val mediaUri: String? = null,
)

/** Completed workout history row, ported from old SRC-001 product models. */
data class WorkoutHistoryEntry(
    val id: String,
    val planId: String = "",
    val planTitle: String = "",
    val durationMinutes: Int = 0,
    val elapsedSeconds: Long,
    val notes: String = "",
    val completedAtEpochMillis: Long,
    val completedSets: Int = 0,
    val totalReps: Int = 0,
    val totalVolumeKg: Double = 0.0,
    val exerciseCount: Int = 0,
) {
    /** Only server-reconciled sessions may feed canonical Progress/Today history. */
    val reconciled: Boolean get() = id.startsWith("cloud-")
}

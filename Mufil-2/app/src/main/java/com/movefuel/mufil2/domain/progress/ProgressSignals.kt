package com.movefuel.mufil2.domain.progress

import com.movefuel.mufil2.domain.model.MealHistoryEntry
import com.movefuel.mufil2.domain.model.WorkoutHistoryEntry
import com.movefuel.mufil2.domain.workout.WorkoutState
import java.time.LocalDate

data class ProgressSignal(
    val label: String,
    val valueText: String,
    val ratio: Float,
)

data class RewardState(
    val label: String,
    val unlocked: Boolean,
)

/**
 * Local progress-signal calculator, ported from old SRC-001 `product/ProgressSignals.kt`.
 * Canonical progress facts are ultimately supplied by the backend; this is the local
 * projection used before reconciliation.
 */
object ProgressSignalCalculator {
    fun signals(
        meals: List<MealHistoryEntry>,
        workoutState: WorkoutState,
        today: LocalDate,
    ): List<ProgressSignal> {
        val weekStart = today.minusDays((today.dayOfWeek.value - 1).toLong())
        val weekMeals = meals.filter { entry ->
            runCatching { LocalDate.parse(entry.localDate) }
                .getOrNull()
                ?.let { date -> date >= weekStart && date <= today } == true && entry.confirmed
        }
        val activeDays = weekMeals.map { it.localDate }.distinct().size
        val workoutRatio = when (workoutState) {
            WorkoutState.COMPLETED -> 1f
            WorkoutState.ACTIVE, WorkoutState.PAUSED, WorkoutState.ENDING -> 0.7f
            WorkoutState.PREPARING -> 0.35f
            WorkoutState.IDLE, WorkoutState.FAILED -> 0f
        }
        val workoutLabel = when (workoutState) {
            WorkoutState.COMPLETED -> "Completed"
            WorkoutState.ACTIVE, WorkoutState.PAUSED, WorkoutState.ENDING -> "In progress"
            WorkoutState.PREPARING -> "Preparing"
            WorkoutState.IDLE, WorkoutState.FAILED -> "Not started"
        }
        return listOf(
            ProgressSignal("Confirmed meal days", "$activeDays / 7 days", (activeDays / 7f).coerceIn(0f, 1f)),
            ProgressSignal("Confirmed meals", "${weekMeals.size} this week", (weekMeals.size / 7f).coerceIn(0f, 1f)),
            ProgressSignal("Workout session", workoutLabel, workoutRatio),
        )
    }

    fun rangeSignals(
        meals: List<MealHistoryEntry>,
        workouts: List<WorkoutHistoryEntry>,
        workoutState: WorkoutState,
        today: LocalDate,
        days: Int,
    ): List<ProgressSignal> {
        val windowDays = days.coerceIn(7, 31)
        val start = today.minusDays((windowDays - 1).toLong())
        val confirmedMeals = meals.filter { entry ->
            entry.confirmed && runCatching { LocalDate.parse(entry.localDate) }
                .getOrNull()
                ?.let { date -> date in start..today } == true
        }
        val activeMealDays = confirmedMeals.map { it.localDate }.distinct().size
        val completedWorkouts = workouts.count { entry ->
            runCatching {
                val date = java.time.Instant.ofEpochMilli(entry.completedAtEpochMillis)
                    .atZone(java.time.ZoneId.systemDefault())
                    .toLocalDate()
                date in start..today
            }.getOrDefault(false)
        }
        val inProgress = workoutState == WorkoutState.ACTIVE ||
            workoutState == WorkoutState.PAUSED ||
            workoutState == WorkoutState.PREPARING ||
            workoutState == WorkoutState.ENDING
        return listOf(
            ProgressSignal("Confirmed meal days", "$activeMealDays / $windowDays days", (activeMealDays / windowDays.toFloat()).coerceIn(0f, 1f)),
            ProgressSignal("Confirmed meals", "${confirmedMeals.size} in ${if (windowDays > 7) "30 days" else "7 days"}", (confirmedMeals.size / windowDays.toFloat()).coerceIn(0f, 1f)),
            ProgressSignal("Completed workouts", "${completedWorkouts + if (inProgress) 1 else 0}", ((completedWorkouts + if (inProgress) 1 else 0) / 4f).coerceIn(0f, 1f)),
        )
    }

    fun rewards(meals: List<MealHistoryEntry>, workoutState: WorkoutState): List<RewardState> =
        rewards(meals, emptyList(), workoutState)

    fun rewards(
        meals: List<MealHistoryEntry>,
        workouts: List<WorkoutHistoryEntry>,
        workoutState: WorkoutState,
    ): List<RewardState> = listOf(
        RewardState("First confirmed meal", meals.any { it.confirmed }),
        RewardState("Three active dates", meals.filter { it.confirmed }.map { it.localDate }.distinct().size >= 3),
        RewardState("Workout completed", workouts.isNotEmpty() || workoutState == WorkoutState.COMPLETED),
    )
}

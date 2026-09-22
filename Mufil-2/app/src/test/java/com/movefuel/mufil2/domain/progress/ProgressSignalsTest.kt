package com.movefuel.mufil2.domain.progress

import com.movefuel.mufil2.domain.model.MealHistoryEntry
import com.movefuel.mufil2.domain.model.WorkoutHistoryEntry
import com.movefuel.mufil2.domain.workout.WorkoutState
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ProgressSignalsTest {
    private fun meal(date: LocalDate, confirmed: Boolean = true) = MealHistoryEntry(
        id = date.toString(),
        title = "Meal",
        mealType = "Lunch",
        grams = 300,
        calories = 600,
        proteinGrams = 35,
        carbohydratesGrams = 60,
        fatGrams = 20,
        fiberGrams = 8,
        localDate = date.toString(),
        confirmed = confirmed,
    )

    @Test
    fun onlyConfirmedMealsInsideTheWeekCount() {
        val today = LocalDate.of(2026, 8, 7)
        val signals = ProgressSignalCalculator.signals(
            meals = listOf(
                meal(today),
                meal(today.minusDays(1), confirmed = false),
                meal(today.minusDays(30)),
            ),
            workoutState = WorkoutState.IDLE,
            today = today,
        )
        assertEquals("1 / 7 days", signals[0].valueText)
        assertEquals("1 this week", signals[1].valueText)
    }

    @Test
    fun workoutStateMapsToBoundedProgress() {
        val today = LocalDate.of(2026, 8, 7)
        val completed = ProgressSignalCalculator.signals(emptyList(), WorkoutState.COMPLETED, today)
        assertEquals("Completed", completed[2].valueText)
        assertEquals(1f, completed[2].ratio)

        val idle = ProgressSignalCalculator.signals(emptyList(), WorkoutState.IDLE, today)
        assertEquals("Not started", idle[2].valueText)
        assertEquals(0f, idle[2].ratio)
    }

    @Test
    fun rewardsUnlockFromConfirmedFactsOnly() {
        val today = LocalDate.of(2026, 8, 7)
        val rewards = ProgressSignalCalculator.rewards(
            meals = listOf(meal(today), meal(today.minusDays(1)), meal(today.minusDays(2))),
            workoutState = WorkoutState.IDLE,
        )
        assertTrue(rewards[0].unlocked)
        assertTrue(rewards[1].unlocked)
        assertFalse(rewards[2].unlocked)

        val withWorkout = ProgressSignalCalculator.rewards(
            meals = emptyList(),
            workouts = listOf(
                WorkoutHistoryEntry(id = "cloud-1", elapsedSeconds = 600, completedAtEpochMillis = 1_700_000_000_000),
            ),
            workoutState = WorkoutState.IDLE,
        )
        assertTrue(withWorkout[2].unlocked)
    }
}

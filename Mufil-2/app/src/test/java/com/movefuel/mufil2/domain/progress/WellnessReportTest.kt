package com.movefuel.mufil2.domain.progress

import com.movefuel.mufil2.domain.model.MealHistoryEntry
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class WellnessReportTest {
    private val profile = WellnessProfile(
        calorieTarget = "2300",
        proteinTarget = "130",
        trainingFrequency = "4 days",
    )

    @Test
    fun sparseWeekDoesNotPublishAConsistencyScore() {
        val report = WellnessReportCalculator.weekly(
            profile = profile,
            meals = listOf(meal(LocalDate.of(2026, 8, 7))),
            workouts = emptyList(),
            today = LocalDate.of(2026, 8, 7),
        )
        assertNull(report.score)
        assertEquals("Insufficient data", report.confidence)
    }

    @Test
    fun reportNeverConvertsMissingDaysIntoZeroIntake() {
        val meals = listOf(
            meal(LocalDate.of(2026, 8, 5), calories = 2100, protein = 120),
            meal(LocalDate.of(2026, 8, 6), calories = 2200, protein = 130),
            meal(LocalDate.of(2026, 8, 7), calories = 2300, protein = 140),
        )
        val report = WellnessReportCalculator.weekly(profile, meals, emptyList(), LocalDate.of(2026, 8, 7))
        assertEquals(2200, report.averageRecordedCalories)
        assertEquals(130, report.averageRecordedProteinGrams)
        assertTrue(report.evidenceNote.contains("Missing meals/days are not treated as zero"))
    }

    private fun meal(date: LocalDate, calories: Int = 600, protein: Int = 35) = MealHistoryEntry(
        id = date.toString(),
        title = "Meal",
        mealType = "Lunch",
        grams = 300,
        calories = calories,
        proteinGrams = protein,
        carbohydratesGrams = 60,
        fatGrams = 20,
        fiberGrams = 8,
        localDate = date.toString(),
    )
}

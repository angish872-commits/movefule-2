package com.movefuel.mufil2.domain.target

import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PersonalTargetEngineTest {
    private fun profile(
        dateOfBirth: String,
        height: String = "175",
        weight: String = "75",
        goal: String = "Maintain weight",
        activityLevel: String = "Moderate",
        trainingFrequency: String = "4 days",
        sexForEnergyEstimation: String = "Male",
        metricUnits: Boolean = true,
    ) = TargetProfile(
        dateOfBirth = dateOfBirth,
        height = height,
        weight = weight,
        metricUnits = metricUnits,
        sexForEnergyEstimation = sexForEnergyEstimation,
        activityLevel = activityLevel,
        trainingFrequency = trainingFrequency,
        goal = goal,
    )

    @Test
    fun adultMaleInactiveEquationMatchesReference() {
        assertEquals(2623, PersonalTargetEngine.adultMaintenanceEnergyKcal("male", TargetActivityCategory.INACTIVE, 30, 175.0, 75.0))
    }

    @Test
    fun age18EquationMatchesReviewedReference() {
        assertEquals(3448, PersonalTargetEngine.adolescentMaintenanceEnergyKcal("male", TargetActivityCategory.ACTIVE, 18, 175.0, 75.0))
        assertEquals(2467, PersonalTargetEngine.adolescentMaintenanceEnergyKcal("female", TargetActivityCategory.ACTIVE, 18, 165.0, 60.0))
    }

    @Test
    fun explicitActivityOutranksTrainingFrequency() {
        assertEquals(TargetActivityCategory.INACTIVE, PersonalTargetEngine.activityCategory("Inactive", "6 days"))
        assertEquals(TargetActivityCategory.ACTIVE, PersonalTargetEngine.activityCategory("Moderate", "1 day"))
    }

    @Test
    fun supportedProfileProducesCalorieProteinAndFiberTargets() {
        val preview = PersonalTargetEngine.preview(
            profile(dateOfBirth = "1996-08-07", goal = "Gain muscle"),
            LocalDate.of(2026, 8, 7),
        )
        assertTrue(preview.supported)
        assertEquals(3014, preview.maintenanceEnergyKcal)
        assertEquals(3210, preview.suggestedEnergyKcal)
        assertEquals(120, preview.proteinGrams)
        assertEquals(90, preview.proteinMinimumGrams)
        assertEquals(120, preview.proteinMaximumGrams)
        assertEquals(45, preview.fiberGrams)
    }

    @Test
    fun age18UsersReceiveAutomaticCalorieTarget() {
        val preview = PersonalTargetEngine.preview(
            profile(dateOfBirth = "2008-08-07"),
            LocalDate.of(2026, 8, 7),
        )
        assertTrue(preview.supported)
        assertEquals(3448, preview.maintenanceEnergyKcal)
        assertEquals(3450, preview.suggestedEnergyKcal)
    }

    @Test
    fun below18DoesNotReceiveAutomaticCalorieTarget() {
        val preview = PersonalTargetEngine.preview(
            profile(dateOfBirth = "2010-08-07", height = "170", weight = "60"),
            LocalDate.of(2026, 8, 7),
        )
        assertFalse(preview.supported)
        assertEquals(null, preview.suggestedEnergyKcal)
    }

    @Test
    fun trendCalibrationUsesSmallConfirmedSteps() {
        val observations = (0..14).map { i ->
            WeightObservation(LocalDate.of(2026, 7, 15).plusDays(i.toLong()), 80.0 - i * 0.005)
        }
        val result = PersonalTargetEngine.recalibrateEnergyFromWeightTrend("Lose weight", 2200, observations)
        assertTrue(result.eligible)
        assertTrue((result.observedWeeklyWeightChangePercent ?: -99.0) > -0.25)
        assertEquals(-100, result.recommendedEnergyAdjustmentKcal)
        assertEquals(2100, result.proposedEnergyTargetKcal)
        assertTrue(result.requiresUserConfirmation)
    }

    @Test
    fun extremeProfileSurfacesMacroReviewWarning() {
        val preview = PersonalTargetEngine.preview(
            profile(
                dateOfBirth = "1986-08-10",
                height = "150",
                weight = "180",
                goal = "Lose weight",
                activityLevel = "Inactive",
                trainingFrequency = "1 day",
                sexForEnergyEstimation = "Female",
            ),
            LocalDate.of(2026, 8, 10),
        )
        assertTrue(preview.supported)
        assertTrue(preview.notes.any { it.contains("AMDR") })
    }

    @Test
    fun malformedTrainingTextDoesNotElevateActivity() {
        assertEquals(TargetActivityCategory.INACTIVE, PersonalTargetEngine.activityCategory("Not specified", "note: trained 7 years ago"))
        assertEquals(TargetActivityCategory.INACTIVE, PersonalTargetEngine.activityCategory("Not specified", "17 days"))
    }
}

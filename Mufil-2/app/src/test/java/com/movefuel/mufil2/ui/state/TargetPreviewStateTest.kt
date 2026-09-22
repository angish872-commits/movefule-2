package com.movefuel.mufil2.ui.state

import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TargetPreviewStateTest {
    private val today = LocalDate.of(2026, 8, 7)

    @Test
    fun unknownProfileDoesNotFabricateTargets() {
        val projection = CanonicalAppState().toTargetPreviewUiState(today)

        assertFalse(projection.supported)
        val energy = projection.rows.first { it.label == "Suggested energy" }
        assertEquals("Unavailable", energy.value)
        assertTrue(projection.notes.isNotEmpty())
    }

    @Test
    fun supportedProfileProducesReviewableTargets() {
        val projection = CanonicalAppState(
            targetDateOfBirth = "1996-08-07",
            targetHeight = "175",
            targetWeight = "75",
            targetSexForEnergyEstimation = "Male",
            targetActivityLevel = "Moderate",
            targetTrainingFrequency = "4 days",
            targetGoal = "Gain muscle",
        ).toTargetPreviewUiState(today)

        assertTrue(projection.supported)
        assertEquals("30 years", projection.rows.first { it.label == "Age" }.value)
        assertEquals("3210 kcal", projection.rows.first { it.label == "Suggested energy" }.value)
        assertEquals("120 g", projection.rows.first { it.label == "Protein" }.value)
        assertEquals("45 g", projection.rows.first { it.label == "Fiber" }.value)
    }
}

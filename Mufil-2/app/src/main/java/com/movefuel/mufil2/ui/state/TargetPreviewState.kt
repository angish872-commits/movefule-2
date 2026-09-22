package com.movefuel.mufil2.ui.state

import com.movefuel.mufil2.domain.target.PersonalTargetEngine
import com.movefuel.mufil2.domain.target.PersonalTargetPreview
import com.movefuel.mufil2.domain.target.TargetProfile
import java.time.LocalDate

data class TargetPreviewRow(
    val label: String,
    val value: String,
    val detail: String? = null,
)

data class TargetPreviewUiState(
    val supported: Boolean,
    val headline: String,
    val rows: List<TargetPreviewRow>,
    val notes: List<String>,
    val formulaVersion: String,
)

/** Builds the engine input from canonical state; unknown fields stay null. */
fun CanonicalAppState.toTargetProfile(): TargetProfile = TargetProfile(
    dateOfBirth = targetDateOfBirth.orEmpty(),
    height = targetHeight.orEmpty(),
    weight = targetWeight.orEmpty(),
    metricUnits = targetMetricUnits,
    sexForEnergyEstimation = targetSexForEnergyEstimation.orEmpty(),
    activityLevel = targetActivityLevel.orEmpty(),
    trainingFrequency = targetTrainingFrequency.orEmpty(),
    goal = targetGoal.orEmpty(),
)

/**
 * Pure projection from canonical state to a reviewable target preview.
 * Missing inputs render as "Unavailable" rather than zero, matching the engine's
 * fail-closed preview contract.
 */
fun CanonicalAppState.toTargetPreviewUiState(today: LocalDate = LocalDate.now()): TargetPreviewUiState {
    val preview = PersonalTargetEngine.preview(toTargetProfile(), today)
    val rows = listOf(
        TargetPreviewRow("Age", preview.ageYears?.let { "$it years" } ?: "Unavailable"),
        TargetPreviewRow(
            "Maintenance energy",
            preview.maintenanceEnergyKcal?.let { "$it kcal" } ?: "Unavailable",
        ),
        TargetPreviewRow(
            "Suggested energy",
            preview.suggestedEnergyKcal?.let { "$it kcal" } ?: "Unavailable",
            preview.energyRangeText(),
        ),
        TargetPreviewRow("Protein", preview.proteinGrams?.let { "$it g" } ?: "Unavailable", preview.proteinRangeText()),
        TargetPreviewRow("Carbohydrate", preview.carbohydrateGrams?.let { "$it g" } ?: "Unavailable"),
        TargetPreviewRow("Fat", preview.fatGrams?.let { "$it g" } ?: "Unavailable"),
        TargetPreviewRow("Fiber", preview.fiberGrams?.let { "$it g" } ?: "Unavailable"),
        TargetPreviewRow("Movement", "${preview.movementMinutes} min"),
    )
    return TargetPreviewUiState(
        supported = preview.supported,
        headline = if (preview.supported) {
            "Review and confirm these future targets"
        } else {
            "Add profile details to preview targets"
        },
        rows = rows,
        notes = preview.notes,
        formulaVersion = preview.formulaVersion,
    )
}

private fun PersonalTargetPreview.energyRangeText(): String? =
    if (energyMinimumKcal != null && energyMaximumKcal != null) {
        "Planning band $energyMinimumKcal-$energyMaximumKcal kcal"
    } else {
        null
    }

private fun PersonalTargetPreview.proteinRangeText(): String? =
    if (proteinMinimumGrams != null && proteinMaximumGrams != null) {
        "Range $proteinMinimumGrams-$proteinMaximumGrams g"
    } else {
        null
    }

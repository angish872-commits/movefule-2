package com.movefuel.mufil2.domain.target

import java.time.LocalDate
import java.time.Period
import java.time.temporal.ChronoUnit
import kotlin.math.max
import kotlin.math.roundToInt

enum class TargetActivityCategory { INACTIVE, LOW_ACTIVE, ACTIVE, VERY_ACTIVE }
enum class TargetGoalCategory { LOSE, MAINTAIN, GAIN, PERFORMANCE, GENERAL }

/**
 * Minimal target-preview input. Deliberately decoupled from Android/Room stores so the
 * target math stays a pure, unit-testable domain engine.
 */
data class TargetProfile(
    val dateOfBirth: String,
    val height: String,
    val weight: String,
    val metricUnits: Boolean,
    val sexForEnergyEstimation: String,
    val activityLevel: String,
    val trainingFrequency: String,
    val goal: String,
)

data class PersonalTargetPreview(
    val supported: Boolean,
    val ageYears: Int?,
    val maintenanceEnergyKcal: Int?,
    val suggestedEnergyKcal: Int?,
    val energyMinimumKcal: Int?,
    val energyMaximumKcal: Int?,
    val proteinGrams: Int?,
    val proteinMinimumGrams: Int?,
    val proteinMaximumGrams: Int?,
    val carbohydrateGrams: Int?,
    val fatGrams: Int?,
    val fiberGrams: Int?,
    val movementMinutes: Int,
    val formulaVersion: String,
    val notes: List<String>,
)

data class ConfirmedMacroTargets(
    val carbohydrateGrams: Int,
    val fatGrams: Int,
    val fiberGrams: Int,
)

data class WeightObservation(
    val localDate: LocalDate,
    val weightKg: Double,
)

data class TargetTrendCalibration(
    val eligible: Boolean,
    val observedWeeklyWeightChangePercent: Double?,
    val targetMinimumWeeklyPercent: Double,
    val targetMaximumWeeklyPercent: Double,
    val recommendedEnergyAdjustmentKcal: Int,
    val proposedEnergyTargetKcal: Int,
    val observationCount: Int,
    val spanDays: Int,
    val requiresUserConfirmation: Boolean = true,
    val notes: List<String> = emptyList(),
)

/**
 * Target-preview math ported from the old MoveFuel Android app (SRC-001
 * `apps/android/.../product/PersonalTargetEngine.kt`).
 *
 * Legacy preview calculator for target-math validation. Production Android code must
 * resolve targets through the backend target engine; this calculator is a reviewable
 * preview and is not a fallback authority.
 *
 * Energy: 2023 National Academies EER equations (age 18 uses the adolescent
 * equation + growth allowance; age 19+ uses the adult equation).
 * Protein: current general U.S. target 1.2-1.6 g/kg/day with 1.6 g/kg used as
 * the muscle/performance/weight-loss starting point.
 * Fiber: 14 g per 1,000 kcal starting target.
 * Every generated target remains a preview until the user confirms it.
 */
object PersonalTargetEngine {
    const val FORMULA_VERSION = "movefuel-targets-2026-08-v2-science-calibrated"

    /** Recomputes macro/fiber display goals from the user's confirmed energy and protein targets. */
    fun macroTargets(energyKcal: Int, proteinGrams: Int): ConfirmedMacroTargets {
        val safeEnergy = energyKcal.coerceAtLeast(0)
        val safeProtein = proteinGrams.coerceAtLeast(0)
        val fat = ((safeEnergy * 0.30) / 9.0).roundToInt().coerceAtLeast(0)
        val carbs = ((safeEnergy - safeProtein * 4 - fat * 9) / 4.0).roundToInt().coerceAtLeast(0)
        val fiber = ((safeEnergy / 1000.0) * 14.0).roundToInt().coerceAtLeast(0)
        return ConfirmedMacroTargets(carbohydrateGrams = carbs, fatGrams = fat, fiberGrams = fiber)
    }

    fun preview(profile: TargetProfile, today: LocalDate = LocalDate.now()): PersonalTargetPreview = preview(
        dateOfBirth = profile.dateOfBirth,
        height = profile.height,
        weight = profile.weight,
        metricUnits = profile.metricUnits,
        sexForEnergyEstimation = profile.sexForEnergyEstimation,
        activityLevel = profile.activityLevel,
        trainingFrequency = profile.trainingFrequency,
        goal = profile.goal,
        today = today,
    )

    fun preview(
        dateOfBirth: String,
        height: String,
        weight: String,
        metricUnits: Boolean,
        sexForEnergyEstimation: String,
        activityLevel: String,
        trainingFrequency: String,
        goal: String,
        today: LocalDate = LocalDate.now(),
    ): PersonalTargetPreview {
        val age = ageYears(dateOfBirth, today)
        val heightCm = parsePositive(height)?.let { if (metricUnits) it else it * 2.54 }
        val weightKg = parsePositive(weight)?.let { if (metricUnits) it else it * 0.45359237 }
        val sex = sexForEnergyEstimation.trim().lowercase()
        val activity = activityCategory(activityLevel, trainingFrequency)
        val goalCategory = goalCategory(goal)
        val notes = mutableListOf<String>()

        val maintenance = when {
            age == null -> { notes += "Add a valid date of birth to calculate an energy target."; null }
            age < 18 -> { notes += "Automatic calorie targets are limited to users age 18+."; null }
            heightCm == null -> { notes += "Add height to calculate an energy target."; null }
            weightKg == null -> { notes += "Add weight to calculate personal targets."; null }
            sex != "male" && sex != "female" -> { notes += "Choose Male or Female only for the energy-estimation equation, or set calories manually later."; null }
            age == 18 -> adolescentMaintenanceEnergyKcal(sex, activity, age, heightCm, weightKg)
            else -> adultMaintenanceEnergyKcal(sex, activity, age, heightCm, weightKg)
        }

        val suggestedEnergy = maintenance?.let { maintenanceKcal ->
            val delta = when (goalCategory) {
                TargetGoalCategory.LOSE -> -250
                TargetGoalCategory.GAIN -> 200
                else -> 0
            }
            max(1_000, ((maintenanceKcal + delta) / 10.0).roundToInt() * 10)
        }

        val protein = weightKg?.let { kg ->
            val multiplier = proteinMultiplier(goalCategory)
            round5(kg * multiplier.central)
        }
        val proteinRange = weightKg?.let { kg ->
            val multiplier = proteinMultiplier(goalCategory)
            round5(kg * multiplier.minimum) to round5(kg * multiplier.maximum)
        }

        val energyForMacros = suggestedEnergy ?: maintenance
        val fat = energyForMacros?.let { ((it * 0.30) / 9.0).roundToInt().coerceAtLeast(0) }
        val carbs = if (energyForMacros != null && fat != null) {
            ((energyForMacros - (protein ?: 0) * 4 - fat * 9) / 4.0).roundToInt().coerceAtLeast(0)
        } else null
        val fiber = energyForMacros?.let { ((it / 1000.0) * 14.0).roundToInt().coerceAtLeast(0) }

        if (energyForMacros != null && energyForMacros > 0 && fat != null && carbs != null) {
            val proteinPercent = protein?.let { it * 4.0 / energyForMacros * 100.0 }
            val fatPercent = fat * 9.0 / energyForMacros * 100.0
            val carbohydratePercent = carbs * 4.0 / energyForMacros * 100.0
            if (proteinPercent != null && (proteinPercent < 10.0 || proteinPercent > 35.0)) {
                notes += "Protein is ${proteinPercent.roundToInt()}% of target energy, outside the adult 10-35% AMDR; keep this as a reviewable preview rather than silently forcing the other macros."
            }
            if (fatPercent < 20.0 || fatPercent > 35.0) {
                notes += "Fat is ${fatPercent.roundToInt()}% of target energy, outside the adult 20-35% AMDR; review the macro split."
            }
            if (carbohydratePercent < 45.0 || carbohydratePercent > 65.0) {
                notes += "Carbohydrate is ${carbohydratePercent.roundToInt()}% of target energy, outside the adult 45-65% AMDR; review the macro split instead of treating it as a prescription."
            }
        }

        val range = if (suggestedEnergy != null && age != null && (sex == "male" || sex == "female")) {
            val rmse = maintenanceRmseKcal(sex, age)
            val halfWidth = max(suggestedEnergy * 0.15, rmse.toDouble())
            max(1_000, ((suggestedEnergy - halfWidth) / 10.0).roundToInt() * 10) to
                (((suggestedEnergy + halfWidth) / 10.0).roundToInt() * 10)
        } else null

        val supported = suggestedEnergy != null && protein != null
        if (supported) {
            notes += "Starting estimates only. Review and confirm them before they become active."
            notes += "The calorie range is an engineering planning band: at least ±15% and never narrower than the published NASEM equation RMSE; it is not a formal 95% confidence interval."
            notes += "Use weight trend over multiple weeks to recalibrate energy instead of treating a single equation as permanent truth."
            if (goalCategory == TargetGoalCategory.LOSE || goalCategory == TargetGoalCategory.GAIN) {
                notes += "The initial goal adjustment is conservative and provisional; MoveFuel should adapt it from confirmed weight trends."
            }
        }

        return PersonalTargetPreview(
            supported = supported,
            ageYears = age,
            maintenanceEnergyKcal = maintenance,
            suggestedEnergyKcal = suggestedEnergy,
            energyMinimumKcal = range?.first,
            energyMaximumKcal = range?.second,
            proteinGrams = protein,
            proteinMinimumGrams = proteinRange?.first,
            proteinMaximumGrams = proteinRange?.second,
            carbohydrateGrams = carbs,
            fatGrams = fat,
            fiberGrams = fiber,
            movementMinutes = 30,
            formulaVersion = FORMULA_VERSION,
            notes = notes,
        )
    }

    internal fun adultMaintenanceEnergyKcal(
        sex: String,
        activity: TargetActivityCategory,
        ageYears: Int,
        heightCm: Double,
        weightKg: Double,
    ): Int {
        val coefficients = if (sex == "male") {
            when (activity) {
                TargetActivityCategory.INACTIVE -> doubleArrayOf(753.07, -10.83, 6.50, 14.10)
                TargetActivityCategory.LOW_ACTIVE -> doubleArrayOf(581.47, -10.83, 8.30, 14.94)
                TargetActivityCategory.ACTIVE -> doubleArrayOf(1004.82, -10.83, 6.52, 15.91)
                TargetActivityCategory.VERY_ACTIVE -> doubleArrayOf(-517.88, -10.83, 15.61, 19.11)
            }
        } else {
            when (activity) {
                TargetActivityCategory.INACTIVE -> doubleArrayOf(584.90, -7.01, 5.72, 11.71)
                TargetActivityCategory.LOW_ACTIVE -> doubleArrayOf(575.77, -7.01, 6.60, 12.14)
                TargetActivityCategory.ACTIVE -> doubleArrayOf(710.25, -7.01, 6.54, 12.34)
                TargetActivityCategory.VERY_ACTIVE -> doubleArrayOf(511.83, -7.01, 9.07, 12.56)
            }
        }
        return (coefficients[0] + coefficients[1] * ageYears + coefficients[2] * heightCm + coefficients[3] * weightKg).roundToInt()
    }

    internal fun adolescentMaintenanceEnergyKcal(
        sex: String,
        activity: TargetActivityCategory,
        ageYears: Int,
        heightCm: Double,
        weightKg: Double,
    ): Int {
        val coefficients = if (sex == "male") {
            when (activity) {
                TargetActivityCategory.INACTIVE -> doubleArrayOf(-447.51, 3.68, 13.01, 13.15)
                TargetActivityCategory.LOW_ACTIVE -> doubleArrayOf(19.12, 3.68, 8.62, 20.28)
                TargetActivityCategory.ACTIVE -> doubleArrayOf(-388.19, 3.68, 12.66, 20.46)
                TargetActivityCategory.VERY_ACTIVE -> doubleArrayOf(-671.75, 3.68, 15.38, 23.25)
            }
        } else {
            when (activity) {
                TargetActivityCategory.INACTIVE -> doubleArrayOf(55.59, -22.25, 8.43, 17.07)
                TargetActivityCategory.LOW_ACTIVE -> doubleArrayOf(-297.54, -22.25, 12.77, 14.73)
                TargetActivityCategory.ACTIVE -> doubleArrayOf(-189.55, -22.25, 11.74, 18.34)
                TargetActivityCategory.VERY_ACTIVE -> doubleArrayOf(-709.59, -22.25, 18.22, 14.25)
            }
        }
        return (coefficients[0] + coefficients[1] * ageYears + coefficients[2] * heightCm + coefficients[3] * weightKg + 20.0).roundToInt()
    }

    fun recalibrateEnergyFromWeightTrend(
        goal: String,
        currentEnergyTargetKcal: Int,
        observations: List<WeightObservation>,
    ): TargetTrendCalibration {
        val goalCategory = goalCategory(goal)
        val band = when (goalCategory) {
            TargetGoalCategory.LOSE -> -0.75 to -0.25
            TargetGoalCategory.GAIN -> 0.10 to 0.40
            else -> -0.20 to 0.20
        }
        val valid = observations
            .filter { it.weightKg > 0 && it.weightKg.isFinite() }
            .sortedBy { it.localDate }
        val latest = valid.lastOrNull()?.localDate
        val recent = if (latest == null) emptyList() else valid.filter { !it.localDate.isBefore(latest.minusDays(27)) }
        val span = if (recent.size >= 2) ChronoUnit.DAYS.between(recent.first().localDate, recent.last().localDate).toInt() else 0
        val current = currentEnergyTargetKcal.coerceAtLeast(1_000)
        if (recent.size < 7 || span < 13) {
            return TargetTrendCalibration(
                eligible = false,
                observedWeeklyWeightChangePercent = null,
                targetMinimumWeeklyPercent = band.first,
                targetMaximumWeeklyPercent = band.second,
                recommendedEnergyAdjustmentKcal = 0,
                proposedEnergyTargetKcal = current,
                observationCount = recent.size,
                spanDays = span,
                notes = listOf("Need at least 7 valid weights spanning at least 14 days before trend-based calorie recalibration."),
            )
        }

        val firstDate = recent.first().localDate
        val xs = recent.map { ChronoUnit.DAYS.between(firstDate, it.localDate).toDouble() }
        val ys = recent.map { it.weightKg }
        val xMean = xs.average()
        val yMean = ys.average()
        val numerator = xs.indices.sumOf { i -> (xs[i] - xMean) * (ys[i] - yMean) }
        val denominator = xs.sumOf { x -> (x - xMean) * (x - xMean) }
        val weeklyPercent = if (denominator > 0 && yMean > 0) (numerator / denominator * 7.0 / yMean) * 100.0 else 0.0
        val adjustment = when {
            weeklyPercent < band.first -> 100
            weeklyPercent > band.second -> -100
            else -> 0
        }
        val proposed = (current + adjustment).coerceAtLeast(1_000)
        val notes = if (adjustment == 0) {
            listOf("Observed weight trend is inside the current goal band; keep the calorie target unchanged.")
        } else {
            listOf("Proposed a small 100 kcal/day correction from the multi-week trend; user confirmation is required before applying it.")
        }
        return TargetTrendCalibration(
            eligible = true,
            observedWeeklyWeightChangePercent = (weeklyPercent * 100.0).roundToInt() / 100.0,
            targetMinimumWeeklyPercent = band.first,
            targetMaximumWeeklyPercent = band.second,
            recommendedEnergyAdjustmentKcal = adjustment,
            proposedEnergyTargetKcal = proposed,
            observationCount = recent.size,
            spanDays = span,
            notes = notes + "Daily scale noise is not treated as calorie truth; recalibration uses a multi-week trend.",
        )
    }

    private fun maintenanceRmseKcal(sex: String, age: Int): Int = when {
        age == 18 && sex == "male" -> 259
        age == 18 -> 237
        sex == "male" -> 339
        else -> 246
    }

    private data class ProteinMultiplier(val central: Double, val minimum: Double, val maximum: Double)

    private fun proteinMultiplier(goal: TargetGoalCategory): ProteinMultiplier = when (goal) {
        TargetGoalCategory.GAIN, TargetGoalCategory.PERFORMANCE, TargetGoalCategory.LOSE -> ProteinMultiplier(1.6, 1.2, 1.6)
        else -> ProteinMultiplier(1.4, 1.2, 1.6)
    }

    internal fun activityCategory(activityLevel: String, trainingFrequency: String): TargetActivityCategory {
        val activity = activityLevel.trim().lowercase().replace("-", "_").replace(" ", "_")
        when (activity) {
            "very_active", "high" -> return TargetActivityCategory.VERY_ACTIVE
            "active", "moderate", "moderately_active" -> return TargetActivityCategory.ACTIVE
            "low_active", "light", "lightly_active" -> return TargetActivityCategory.LOW_ACTIVE
            "inactive", "sedentary" -> return TargetActivityCategory.INACTIVE
        }

        // Only parse forms produced by MoveFuel controls. Arbitrary text that
        // happens to contain a digit must never silently select a higher EER.
        val training = trainingFrequency.trim().lowercase()
        val exact = Regex("^(\\d+)\\s*(?:days?)?$").matchEntire(training)?.groupValues?.get(1)?.toIntOrNull()
        val range = Regex("^(\\d+)\\s*[-–]\\s*(\\d+)\\s*days?$").matchEntire(training)?.let {
            it.groupValues[1].toIntOrNull()?.let { minimum ->
                it.groupValues[2].toIntOrNull()?.let { maximum -> minimum to maximum }
            }
        }
        val plus = Regex("^(\\d+)\\+\\s*days?$").matchEntire(training)?.groupValues?.get(1)?.toIntOrNull()
        val bounds = when {
            exact != null && exact in 0..7 -> exact to exact
            range != null && range.first in 0..7 && range.second in range.first..7 -> range
            plus != null && plus in 0..7 -> plus to 7
            else -> null
        } ?: return TargetActivityCategory.INACTIVE
        return when {
            bounds.first >= 6 -> TargetActivityCategory.VERY_ACTIVE
            bounds.second >= 3 -> TargetActivityCategory.ACTIVE
            bounds.second >= 1 -> TargetActivityCategory.LOW_ACTIVE
            else -> TargetActivityCategory.INACTIVE
        }
    }

    private fun goalCategory(goal: String): TargetGoalCategory {
        val value = goal.trim().lowercase()
        return when {
            value.contains("lose") || value.contains("loss") || value.contains("deficit") -> TargetGoalCategory.LOSE
            value.contains("gain") || value.contains("strength") || value.contains("muscle") -> TargetGoalCategory.GAIN
            value.contains("perform") || value.contains("endurance") -> TargetGoalCategory.PERFORMANCE
            value.contains("maintain") || value.contains("steady") -> TargetGoalCategory.MAINTAIN
            else -> TargetGoalCategory.GENERAL
        }
    }

    private fun ageYears(dateOfBirth: String, today: LocalDate): Int? = runCatching {
        val date = LocalDate.parse(dateOfBirth.trim())
        Period.between(date, today).years.takeIf { it in 0..120 }
    }.getOrNull()

    private fun parsePositive(value: String): Double? = value.trim().replace(Regex("[^0-9.+-]"), "").toDoubleOrNull()?.takeIf { it > 0 }
    private fun round5(value: Double): Int = max(0, (value / 5.0).roundToInt() * 5)
}

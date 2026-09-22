package com.movefuel.mufil2.domain.progress

import com.movefuel.mufil2.domain.model.MealHistoryEntry
import com.movefuel.mufil2.domain.model.WorkoutHistoryEntry
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.ceil
import kotlin.math.roundToInt

/** Minimal reviewed-target input for a wellness report, decoupled from Android stores. */
data class WellnessProfile(
    val calorieTarget: String = "",
    val proteinTarget: String = "",
    val trainingFrequency: String = "",
)

data class WellnessReportComponent(
    val key: String,
    val label: String,
    val score: Int,
    val evidence: String,
)

data class WellnessReport(
    val reportType: String,
    val periodStart: String,
    val periodEnd: String,
    val score: Int?,
    val scoreLabel: String,
    val confidence: String,
    val observedDays: Int,
    val totalDays: Int,
    val confirmedMeals: Int,
    val completedWorkouts: Int,
    val workoutMinutes: Int,
    val completedSets: Int,
    val trainingVolumeKg: Double,
    val exerciseCount: Int,
    val averageRecordedCalories: Int,
    val averageRecordedProteinGrams: Int,
    val averageRecordedCarbohydrateGrams: Int,
    val averageRecordedFatGrams: Int,
    val averageRecordedFiberGrams: Int,
    val components: List<WellnessReportComponent>,
    val strongestSignal: String,
    val nextAction: String,
    val evidenceNote: String,
)

/**
 * A deterministic consistency report built only from evidence MoveFuel actually owns:
 * confirmed meal rows, reviewed targets, and completed workout history.
 *
 * This is intentionally not a medical/health score. Missing days remain missing; they are
 * never converted into zero calorie/protein intake. Ported from old SRC-001
 * `product/WellnessReport.kt`.
 */
object WellnessReportCalculator {
    fun weekly(
        profile: WellnessProfile,
        meals: List<MealHistoryEntry>,
        workouts: List<WorkoutHistoryEntry>,
        today: LocalDate = LocalDate.now(),
    ): WellnessReport = build(profile, meals, workouts, today.minusDays(6), today, "weekly")

    fun monthly(
        profile: WellnessProfile,
        meals: List<MealHistoryEntry>,
        workouts: List<WorkoutHistoryEntry>,
        today: LocalDate = LocalDate.now(),
    ): WellnessReport = build(profile, meals, workouts, today.withDayOfMonth(1), today, "monthly")

    private fun build(
        profile: WellnessProfile,
        meals: List<MealHistoryEntry>,
        workouts: List<WorkoutHistoryEntry>,
        start: LocalDate,
        end: LocalDate,
        reportType: String,
    ): WellnessReport {
        val totalDays = (end.toEpochDay() - start.toEpochDay() + 1).toInt().coerceAtLeast(1)
        val confirmed = meals.filter { meal ->
            meal.confirmed && runCatching { LocalDate.parse(meal.localDate) }.getOrNull()?.let { it in start..end } == true
        }
        val byDay = confirmed.groupBy { it.localDate }
        val observedDays = byDay.size
        val completed = workouts.filter { entry ->
            runCatching {
                Instant.ofEpochMilli(entry.completedAtEpochMillis).atZone(ZoneId.systemDefault()).toLocalDate() in start..end
            }.getOrDefault(false)
        }
        val calorieGoal = profile.calorieTarget.filter(Char::isDigit).toIntOrNull()?.takeIf { it > 0 }
        val proteinGoal = profile.proteinTarget.filter(Char::isDigit).toIntOrNull()?.takeIf { it > 0 }
        val expectedWeeklySessions = parseTrainingDays(profile.trainingFrequency)
        val expectedSessions = if (expectedWeeklySessions > 0) {
            ceil(expectedWeeklySessions * totalDays / 7.0).toInt().coerceAtLeast(1)
        } else 0

        val loggingScore = (observedDays * 100f / totalDays).roundToInt().coerceIn(0, 100)
        val recordedProteinProgress = if (proteinGoal != null && observedDays > 0) {
            byDay.values.map { dayMeals ->
                (dayMeals.sumOf { it.proteinGrams }.toFloat() / proteinGoal).coerceIn(0f, 1f)
            }.average().times(100).roundToInt().coerceIn(0, 100)
        } else null
        val trainingScore = if (expectedSessions > 0) {
            (completed.size * 100f / expectedSessions).roundToInt().coerceIn(0, 100)
        } else null

        val components = buildList {
            add(WellnessReportComponent(
                key = "logging",
                label = "Tracking coverage",
                score = loggingScore,
                evidence = "$observedDays of $totalDays days contain at least one confirmed meal.",
            ))
            recordedProteinProgress?.let { score ->
                add(WellnessReportComponent(
                    key = "protein",
                    label = "Recorded protein progress",
                    score = score,
                    evidence = "Average confirmed protein recorded on observed days compared with the reviewed ${proteinGoal} g target.",
                ))
            }
            trainingScore?.let { score ->
                add(WellnessReportComponent(
                    key = "training",
                    label = "Training consistency",
                    score = score,
                    evidence = "${completed.size} completed session(s) versus $expectedSessions planned for this period.",
                ))
            }
        }

        // The score represents consistency evidence, not physiology. Require enough observed
        // days before publishing a number so sparse logging is never presented as a judgment.
        val minimumObserved = if (reportType == "weekly") 3 else minOf(10, totalDays)
        val score = if (observedDays >= minimumObserved) weightedScore(components) else null
        val confidence = when {
            score == null -> "Insufficient data"
            observedDays >= (totalDays * 0.8f).roundToInt().coerceAtLeast(1) -> "High"
            observedDays >= (totalDays * 0.5f).roundToInt().coerceAtLeast(1) -> "Moderate"
            else -> "Low"
        }
        val scoreLabel = when {
            score == null -> "Building your baseline"
            score >= 90 -> "Excellent consistency"
            score >= 75 -> "Strong consistency"
            score >= 60 -> "Building consistency"
            else -> "Early consistency signal"
        }

        fun average(selector: (MealHistoryEntry) -> Int): Int = if (observedDays == 0) 0 else {
            byDay.values.map { dayMeals -> dayMeals.sumOf(selector) }.average().roundToInt()
        }

        val strongest = components.maxByOrNull { it.score }
        val weakest = components.minByOrNull { it.score }
        val strongestSignal = strongest?.let { "${it.label} is the strongest recorded signal (${it.score}/100)." }
            ?: "Confirm meals and workouts to build a reliable pattern."
        val nextAction = when (weakest?.key) {
            "logging" -> "Confirm at least one meal on more days so future reports have stronger coverage."
            "protein" -> "Use the Fuel screen to close the recorded protein gap on the days you track."
            "training" -> "Complete the next planned session at a comfortable pace and let the watch/phone record it."
            else -> "Keep logging consistently; MoveFuel will make the next report more specific."
        }
        val recordedEnergyNote = calorieGoal?.let { "Reviewed energy target: $it kcal. " }.orEmpty()

        return WellnessReport(
            reportType = reportType,
            periodStart = start.toString(),
            periodEnd = end.toString(),
            score = score,
            scoreLabel = scoreLabel,
            confidence = confidence,
            observedDays = observedDays,
            totalDays = totalDays,
            confirmedMeals = confirmed.size,
            completedWorkouts = completed.size,
            workoutMinutes = (completed.sumOf { it.elapsedSeconds } / 60L).toInt(),
            completedSets = completed.sumOf { it.completedSets },
            trainingVolumeKg = kotlin.math.round(completed.sumOf { it.totalVolumeKg } * 100.0) / 100.0,
            exerciseCount = completed.sumOf { it.exerciseCount },
            averageRecordedCalories = average { it.calories },
            averageRecordedProteinGrams = average { it.proteinGrams },
            averageRecordedCarbohydrateGrams = average { it.carbohydratesGrams },
            averageRecordedFatGrams = average { it.fatGrams },
            averageRecordedFiberGrams = average { it.fiberGrams },
            components = components,
            strongestSignal = strongestSignal,
            nextAction = nextAction,
            evidenceNote = recordedEnergyNote + "Averages describe confirmed records only. Missing meals/days are not treated as zero intake. This is a consistency report, not a medical or physiological score.",
        )
    }

    private fun weightedScore(components: List<WellnessReportComponent>): Int {
        if (components.isEmpty()) return 0
        val weights = mapOf("logging" to 40, "protein" to 30, "training" to 30)
        val presentWeight = components.sumOf { weights[it.key] ?: 0 }.coerceAtLeast(1)
        return components.sumOf { component -> component.score * (weights[component.key] ?: 0) }
            .toFloat().div(presentWeight).roundToInt().coerceIn(0, 100)
    }

    private fun parseTrainingDays(value: String): Int {
        val match = Regex("(\\d+)").find(value)
        return match?.groupValues?.getOrNull(1)?.toIntOrNull()?.coerceIn(0, 7) ?: 0
    }
}

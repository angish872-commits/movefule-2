package com.movefuel.mufil2.domain.workout

/** Deterministic elapsed-time calculation for the workout lifecycle. */
object WorkoutElapsed {
    fun secondsAt(snapshot: WorkoutSnapshot, nowEpochMillis: Long): Long {
        val base = snapshot.elapsedSeconds.coerceAtLeast(0)
        if (snapshot.state != WorkoutState.ACTIVE) return base

        val deltaSeconds = ((nowEpochMillis - snapshot.updatedAtEpochMillis)
            .coerceAtLeast(0L)) / 1_000L
        return if (deltaSeconds > Long.MAX_VALUE - base) {
            Long.MAX_VALUE
        } else {
            base + deltaSeconds
        }
    }
}

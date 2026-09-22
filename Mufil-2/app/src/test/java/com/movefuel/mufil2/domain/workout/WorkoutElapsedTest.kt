package com.movefuel.mufil2.domain.workout

import org.junit.Assert.assertEquals
import org.junit.Test

class WorkoutElapsedTest {
    @Test
    fun activeSnapshotAccumulatesOnlyForwardClockTime() {
        val snapshot = snapshot(
            state = WorkoutState.ACTIVE,
            updatedAtEpochMillis = 1_700_000_000_000,
            elapsedSeconds = 30
        )

        assertEquals(42L, WorkoutElapsed.secondsAt(snapshot, 1_700_000_012_000))
        assertEquals(30L, WorkoutElapsed.secondsAt(snapshot, 1_699_999_999_000))
    }

    @Test
    fun pausedAndCompletedSnapshotsRemainFixed() {
        val paused = snapshot(
            state = WorkoutState.PAUSED,
            updatedAtEpochMillis = 1_700_000_000_000,
            elapsedSeconds = 90
        )
        val completed = paused.copy(state = WorkoutState.COMPLETED)

        assertEquals(90L, WorkoutElapsed.secondsAt(paused, 1_700_000_300_000))
        assertEquals(90L, WorkoutElapsed.secondsAt(completed, 1_700_000_300_000))
    }

    @Test
    fun elapsedOverflowSaturatesSafely() {
        val snapshot = snapshot(
            state = WorkoutState.ACTIVE,
            updatedAtEpochMillis = 0,
            elapsedSeconds = Long.MAX_VALUE
        )

        assertEquals(Long.MAX_VALUE, WorkoutElapsed.secondsAt(snapshot, 1_000))
    }

    private fun snapshot(
        state: WorkoutState,
        updatedAtEpochMillis: Long,
        elapsedSeconds: Long
    ) = WorkoutSnapshot(
        sessionId = "elapsed-test",
        revision = 3,
        state = state,
        updatedAtEpochMillis = updatedAtEpochMillis,
        elapsedSeconds = elapsedSeconds
    )
}

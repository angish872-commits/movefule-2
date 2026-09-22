package com.movefuel.mufil2.domain.workout

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class WorkoutStateMachineTest {
    @Test
    fun lifecycleReachesCompletedWithMonotonicRevisions() {
        var now = 1_700_000_000_000L
        val initial = WorkoutSnapshot(
            sessionId = "session-1",
            revision = 0,
            state = WorkoutState.IDLE,
            updatedAtEpochMillis = now,
            elapsedSeconds = 0
        )
        val machine = WorkoutStateMachine(initial) { ++now }

        assertEquals(WorkoutState.PREPARING, machine.start().state)
        assertEquals(WorkoutState.ACTIVE, machine.activate().state)
        assertEquals(WorkoutState.PAUSED, machine.pause().state)
        assertEquals(WorkoutState.ACTIVE, machine.resume().state)
        assertEquals(WorkoutState.ENDING, machine.end().state)
        assertEquals(WorkoutState.COMPLETED, machine.complete().state)
        assertEquals(6, machine.snapshot.revision)
    }

    @Test(expected = IllegalArgumentException::class)
    fun invalidTransitionFails() {
        val machine = WorkoutStateMachine(
            WorkoutSnapshot(
                sessionId = "session-1",
                revision = 0,
                state = WorkoutState.IDLE,
                updatedAtEpochMillis = 1,
                elapsedSeconds = 0
            )
        ) { 2 }
        machine.pause()
    }

    @Test
    fun activeTransitionCapturesElapsedBeforePausing() {
        var now = 1_700_000_000_000L
        val machine = WorkoutStateMachine(
            WorkoutSnapshot(
                sessionId = "session-elapsed",
                revision = 0,
                state = WorkoutState.ACTIVE,
                updatedAtEpochMillis = now,
                elapsedSeconds = 30
            )
        ) { now += 12_000; now }

        val paused = machine.pause()

        assertEquals(WorkoutState.PAUSED, paused.state)
        assertEquals(42L, paused.elapsedSeconds)
    }

    @Test
    fun startingAfterCompletionCreatesANewSessionId() {
        val machine = WorkoutStateMachine(
            WorkoutSnapshot(
                sessionId = "session-completed",
                revision = 6,
                state = WorkoutState.COMPLETED,
                updatedAtEpochMillis = 1_700_000_000_006,
                elapsedSeconds = 120
            )
        ) { 1_700_000_000_007 }

        val started = machine.start()

        assertEquals(WorkoutState.PREPARING, started.state)
        assertNotEquals("session-completed", started.sessionId)
        assertEquals("session-completed-next-7", started.sessionId)
        assertEquals(120L, started.elapsedSeconds)
    }
}

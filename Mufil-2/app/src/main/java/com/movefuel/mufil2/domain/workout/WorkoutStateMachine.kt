package com.movefuel.mufil2.domain.workout

/**
 * Workout lifecycle state, ported from old SRC-001 `core-model`.
 * Kept free of serialization annotations so the pure state machine has no Android deps.
 */
enum class WorkoutState {
    IDLE,
    PREPARING,
    ACTIVE,
    PAUSED,
    ENDING,
    COMPLETED,
    FAILED
}

data class WorkoutSnapshot(
    val schemaVersion: Int = CURRENT_SCHEMA_VERSION,
    val sessionId: String,
    val revision: Long,
    val state: WorkoutState,
    val updatedAtEpochMillis: Long,
    val elapsedSeconds: Long
) {
    fun validationErrors(): List<String> = buildList {
        if (schemaVersion != CURRENT_SCHEMA_VERSION) add("unsupported_schema_version")
        if (sessionId.isBlank()) add("blank_session_id")
        if (revision < 0) add("negative_revision")
        if (updatedAtEpochMillis <= 0) add("invalid_timestamp")
        if (elapsedSeconds < 0) add("negative_elapsed")
    }

    fun isValid(): Boolean = validationErrors().isEmpty()

    companion object {
        const val CURRENT_SCHEMA_VERSION = 1
    }
}

class WorkoutStateMachine(
    initial: WorkoutSnapshot,
    private val nowEpochMillis: () -> Long
) {
    var snapshot: WorkoutSnapshot = initial
        private set

    fun start(): WorkoutSnapshot = transition(
        allowedFrom = setOf(WorkoutState.IDLE, WorkoutState.COMPLETED, WorkoutState.FAILED),
        next = WorkoutState.PREPARING
    )

    fun activate(): WorkoutSnapshot = transition(
        allowedFrom = setOf(WorkoutState.PREPARING),
        next = WorkoutState.ACTIVE
    )

    fun pause(): WorkoutSnapshot = transition(
        allowedFrom = setOf(WorkoutState.ACTIVE),
        next = WorkoutState.PAUSED
    )

    fun resume(): WorkoutSnapshot = transition(
        allowedFrom = setOf(WorkoutState.PAUSED),
        next = WorkoutState.ACTIVE
    )

    fun end(): WorkoutSnapshot = transition(
        allowedFrom = setOf(WorkoutState.ACTIVE, WorkoutState.PAUSED),
        next = WorkoutState.ENDING
    )

    fun complete(): WorkoutSnapshot = transition(
        allowedFrom = setOf(WorkoutState.ENDING),
        next = WorkoutState.COMPLETED
    )

    private fun transition(
        allowedFrom: Set<WorkoutState>,
        next: WorkoutState
    ): WorkoutSnapshot {
        require(snapshot.state in allowedFrom) {
            "Cannot transition ${snapshot.state} to $next"
        }
        val now = nowEpochMillis()
        snapshot = snapshot.copy(
            sessionId = nextSessionId(next),
            state = next,
            revision = snapshot.revision + 1,
            updatedAtEpochMillis = now,
            elapsedSeconds = WorkoutElapsed.secondsAt(snapshot, now)
        )
        return snapshot
    }

    private fun nextSessionId(next: WorkoutState): String =
        if (next == WorkoutState.PREPARING &&
            snapshot.state in setOf(WorkoutState.COMPLETED, WorkoutState.FAILED)
        ) {
            "${snapshot.sessionId}-next-${snapshot.revision + 1}"
        } else {
            snapshot.sessionId
        }
}

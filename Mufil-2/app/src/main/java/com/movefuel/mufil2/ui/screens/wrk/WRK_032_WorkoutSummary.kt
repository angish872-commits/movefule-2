package com.movefuel.mufil2.ui.screens.wrk

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WRK032WorkoutSummaryScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WRK_032",
        title = "Workout Summary",
        subtitle = "Performed facts are saved separately from the original workout prescription.",
        primaryLabel = "Done",
        primaryRoute = MoveFuelRoute.MASTER_TRAIN,
        secondaryLabel = "View Progress",
        secondaryRoute = MoveFuelRoute.MASTER_PROGRESS,
        onNavigate = onNavigate,
    ) {
        MFMetricRow("Completed" to "5/5", "Time" to "43m", "RPE" to "7")
        MFListItem(
            "Bench press",
            "4 performed sets",
            "Saved",
            onClick = { onNavigate(MoveFuelRoute.PRG_018) },
        )
        MFListItem(
            "Seated row",
            "3 performed sets",
            "Saved",
            onClick = { onNavigate(MoveFuelRoute.PRG_019) },
        )
        MFStatusBanner(
            "Workout saved",
            "Today, Train, Calendar, and Progress can now consume the same performed workout facts.",
            MoveFuelColors.Success,
        )
        MFNotice(
            title = "Sync status",
            body = "If a watch recorded the workout offline, the performed facts remain pending until acknowledged by the phone/backend.",
            action = "View device status",
            onAction = { onNavigate(MoveFuelRoute.DEV_001) },
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0B1420, widthDp = 390, heightDp = 844)
@Composable
private fun WRK032WorkoutSummaryScreenPreview() {
    MoveFuelTheme { WRK032WorkoutSummaryScreen {} }
}

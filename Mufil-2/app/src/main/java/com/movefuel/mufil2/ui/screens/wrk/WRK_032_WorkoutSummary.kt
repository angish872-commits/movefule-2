package com.movefuel.mufil2.ui.screens.wrk

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WRK032WorkoutSummaryScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WRK_032",
        title = "Workout Summary",
        subtitle = "Live workout execution using performed facts.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SOR_001,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WRK_031,
        onNavigate = onNavigate,
    ) {
            MFMetricRow("Completed" to "5/5","Time" to "43m","RPE" to "7")
            MFListItem("Bench press","4 sets completed","Saved")
            MFListItem("Seated row","3 sets completed","Saved")
            MFStatusBanner("Workout saved","Sync status remains visible until acknowledged.",MoveFuelColors.Success)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WRK032WorkoutSummaryScreenPreview() {
    MoveFuelTheme { WRK032WorkoutSummaryScreen {} }
}

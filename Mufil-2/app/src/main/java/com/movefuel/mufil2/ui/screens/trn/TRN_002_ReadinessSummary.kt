package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRN002ReadinessSummaryScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRN_002",
        title = "Readiness Summary",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_003,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRN_001,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Reduced","Lower-body soreness changed today’s plan.",MoveFuelColors.Warning)
            MFMetricRow("Energy" to "Good","Fatigue" to "Medium","Soreness" to "Legs")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN002ReadinessSummaryScreenPreview() {
    MoveFuelTheme { TRN002ReadinessSummaryScreen {} }
}

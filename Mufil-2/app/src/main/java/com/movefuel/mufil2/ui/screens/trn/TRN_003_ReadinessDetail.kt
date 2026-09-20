package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRN003ReadinessDetailScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRN_003",
        title = "Readiness Detail",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_004,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRN_002,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Reduced","Lower-body soreness changed today’s plan.",MoveFuelColors.Warning)
            MFMetricRow("Energy" to "Good","Fatigue" to "Medium","Soreness" to "Legs")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN003ReadinessDetailScreenPreview() {
    MoveFuelTheme { TRN003ReadinessDetailScreen {} }
}

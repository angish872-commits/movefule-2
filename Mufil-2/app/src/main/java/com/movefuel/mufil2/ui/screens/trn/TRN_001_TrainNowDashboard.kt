package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRN001TrainNowDashboardScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRN_001",
        title = "Train Now Dashboard",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRS_020,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Readiness · Reduced","Today’s workout is adapted to current inputs.",MoveFuelColors.Warning)
            MFMediaPanel("Upper Strength A","46 min · 5 exercises",true)
            MFListItem("Quick Start","Flexible session","Open")
            MFListItem("Weekly Plan","3 scheduled sessions","Open")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN001TrainNowDashboardScreenPreview() {
    MoveFuelTheme { TRN001TrainNowDashboardScreen {} }
}

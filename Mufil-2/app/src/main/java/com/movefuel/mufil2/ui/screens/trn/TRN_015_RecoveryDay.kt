package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRN015RecoveryDayScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRN_015",
        title = "Recovery Day",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_016,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRN_014,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Recovery day","Today’s plan prioritizes recovery.",MoveFuelColors.Info)
            MFListItem("Easy walk","20–30 min","Start")
            MFListItem("Mobility","10 min","Start")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN015RecoveryDayScreenPreview() {
    MoveFuelTheme { TRN015RecoveryDayScreen {} }
}

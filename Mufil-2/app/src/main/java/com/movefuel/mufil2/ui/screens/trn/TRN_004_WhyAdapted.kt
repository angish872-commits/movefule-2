package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRN004WhyAdaptedScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRN_004",
        title = "Why Adapted",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_005,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRN_003,
        onNavigate = onNavigate,
    ) {
            MFNotice("Why today changed","Current readiness and soreness reduced lower-body intensity.")
            MFListItem("Original plan","5 exercises · normal load","View")
            MFListItem("Adapted plan","5 exercises · reduced lower-body demand","Active")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN004WhyAdaptedScreenPreview() {
    MoveFuelTheme { TRN004WhyAdaptedScreen {} }
}

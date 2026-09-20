package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRN012LessTimeTodayScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRN_012",
        title = "Less Time Today",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_013,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRN_011,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("20 minutes","Keep priority exercises",true)
            MFOptionCard("30 minutes","Moderate reduction")
            MFOptionCard("Keep full workout","No change")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN012LessTimeTodayScreenPreview() {
    MoveFuelTheme { TRN012LessTimeTodayScreen {} }
}

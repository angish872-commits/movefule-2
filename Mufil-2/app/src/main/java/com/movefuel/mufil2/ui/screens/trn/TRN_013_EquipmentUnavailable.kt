package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRN013EquipmentUnavailableScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRN_013",
        title = "Equipment Unavailable",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_014,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRN_012,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Dumbbell press","Same movement pattern",true)
            MFOptionCard("Push-up","Bodyweight alternative")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN013EquipmentUnavailableScreenPreview() {
    MoveFuelTheme { TRN013EquipmentUnavailableScreen {} }
}

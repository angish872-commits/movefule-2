package com.movefuel.mufil2.ui.screens.sor

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SOR008CurrentSorenessSummaryScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SOR_008",
        title = "Current Soreness Summary",
        subtitle = "Soreness body-map workflow; pain stays separate.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SOR_009,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SOR_007,
        onNavigate = onNavigate,
    ) {
            MFListItem("Left quadriceps","Mild · today","Edit")
            MFListItem("Upper back","Moderate · yesterday","History")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SOR008CurrentSorenessSummaryScreenPreview() {
    MoveFuelTheme { SOR008CurrentSorenessSummaryScreen {} }
}

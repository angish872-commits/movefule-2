package com.movefuel.mufil2.ui.screens.sor

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SOR007SaveSorenessScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SOR_007",
        title = "Save Soreness",
        subtitle = "Soreness body-map workflow; pain stays separate.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SOR_008,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SOR_006,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Soreness saved","The modifier can expire while history remains.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SOR007SaveSorenessScreenPreview() {
    MoveFuelTheme { SOR007SaveSorenessScreen {} }
}

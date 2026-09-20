package com.movefuel.mufil2.ui.screens.wrk

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WRK011RPEInputScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WRK_011",
        title = "RPE Input",
        subtitle = "Live workout execution using performed facts.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WRK_012,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WRK_010,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("RPE 6")
            MFOptionCard("RPE 7",null,true)
            MFOptionCard("RPE 8")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WRK011RPEInputScreenPreview() {
    MoveFuelTheme { WRK011RPEInputScreen {} }
}

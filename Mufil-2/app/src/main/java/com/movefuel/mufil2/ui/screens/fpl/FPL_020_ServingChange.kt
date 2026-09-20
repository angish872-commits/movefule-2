package com.movefuel.mufil2.ui.screens.fpl

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FPL020ServingChangeScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FPL_020",
        title = "Serving Change",
        subtitle = "Future meal planning kept separate from consumed food.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FPL_021,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FPL_019,
        onNavigate = onNavigate,
    ) {
            MFField("Planned serving","1 serving")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FPL020ServingChangeScreenPreview() {
    MoveFuelTheme { FPL020ServingChangeScreen {} }
}

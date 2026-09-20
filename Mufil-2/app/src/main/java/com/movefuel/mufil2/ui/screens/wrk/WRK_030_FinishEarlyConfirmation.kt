package com.movefuel.mufil2.ui.screens.wrk

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WRK030FinishEarlyConfirmationScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WRK_030",
        title = "Finish Early Confirmation",
        subtitle = "Live workout execution using performed facts.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WRK_031,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WRK_029,
        onNavigate = onNavigate,
    ) {
            MFNotice("Finish early?","Completed sets stay recorded; incomplete work is not fabricated.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WRK030FinishEarlyConfirmationScreenPreview() {
    MoveFuelTheme { WRK030FinishEarlyConfirmationScreen {} }
}

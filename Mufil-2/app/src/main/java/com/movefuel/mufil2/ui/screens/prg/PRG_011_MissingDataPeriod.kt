package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG011MissingDataPeriodScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_011",
        title = "Missing Data Period",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_012,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_010,
        onNavigate = onNavigate,
    ) {
            MFNotice("No observation","This period stays a visible gap instead of being interpolated.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG011MissingDataPeriodScreenPreview() {
    MoveFuelTheme { PRG011MissingDataPeriodScreen {} }
}

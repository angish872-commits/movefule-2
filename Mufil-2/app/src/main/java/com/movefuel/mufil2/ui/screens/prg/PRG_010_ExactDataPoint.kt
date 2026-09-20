package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG010ExactDataPointScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_010",
        title = "Exact Data Point",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_011,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_009,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("September 19","42 units · confirmed observation")
            MFListItem("Source","Workout completion","Actual")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG010ExactDataPointScreenPreview() {
    MoveFuelTheme { PRG010ExactDataPointScreen {} }
}

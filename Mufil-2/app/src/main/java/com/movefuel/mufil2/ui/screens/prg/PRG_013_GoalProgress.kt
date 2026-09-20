package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG013GoalProgressScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_013",
        title = "Goal Progress",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_014,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_012,
        onNavigate = onNavigate,
    ) {
            MFGraphCard("Goal progress","Target changes do not rewrite historical data.")
            MFStatusBanner("Current future target","Applies only from its effective date.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG013GoalProgressScreenPreview() {
    MoveFuelTheme { PRG013GoalProgressScreen {} }
}

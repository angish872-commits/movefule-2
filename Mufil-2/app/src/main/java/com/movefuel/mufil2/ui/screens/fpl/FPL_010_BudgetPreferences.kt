package com.movefuel.mufil2.ui.screens.fpl

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FPL010BudgetPreferencesScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FPL_010",
        title = "Budget Preferences",
        subtitle = "Future meal planning kept separate from consumed food.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FPL_011,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FPL_009,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Preferred", "Current plan preference", true)
            MFOptionCard("Alternative", "Tap to change")
            MFNotice("Planning rule", "Preferences guide planning but never rewrite consumed history.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FPL010BudgetPreferencesScreenPreview() {
    MoveFuelTheme { FPL010BudgetPreferencesScreen {} }
}

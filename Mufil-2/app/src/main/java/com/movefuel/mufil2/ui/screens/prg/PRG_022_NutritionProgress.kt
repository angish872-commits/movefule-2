package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG022NutritionProgressScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_022",
        title = "Nutrition Progress",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_023,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_021,
        onNavigate = onNavigate,
    ) {
            MFGraphCard(title = "Nutrition Progress", subtitle = "Confirmed intake only")
            MFMetricRow("Average" to "Stable","Coverage" to "92%")
            MFNotice("Planned food excluded","Future meal plans are not counted as consumed nutrition.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG022NutritionProgressScreenPreview() {
    MoveFuelTheme { PRG022NutritionProgressScreen {} }
}

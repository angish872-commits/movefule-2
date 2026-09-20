package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG023NutritionAveragesScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_023",
        title = "Nutrition Averages",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_024,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_022,
        onNavigate = onNavigate,
    ) {
            MFGraphCard(title = "Nutrition Averages", subtitle = "Confirmed intake only")
            MFMetricRow("Average" to "Stable","Coverage" to "92%")
            MFNotice("Planned food excluded","Future meal plans are not counted as consumed nutrition.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG023NutritionAveragesScreenPreview() {
    MoveFuelTheme { PRG023NutritionAveragesScreen {} }
}

package com.movefuel.mufil2.ui.screens.fpl

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FPL017PlannedMealDetailScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FPL_017",
        title = "Planned Meal Detail",
        subtitle = "Future meal planning kept separate from consumed food.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FPL_018,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FPL_016,
        onNavigate = onNavigate,
    ) {
            MFListItem("Chicken rice bowl","Planned · not consumed","610 kcal")
            MFMetricRow("Protein" to "45g","Carbs" to "72g","Fat" to "16g")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FPL017PlannedMealDetailScreenPreview() {
    MoveFuelTheme { FPL017PlannedMealDetailScreen {} }
}

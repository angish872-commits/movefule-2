package com.movefuel.mufil2.ui.screens.fpl

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FPL014GeneratingMealPlanScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FPL_014",
        title = "Generating Meal Plan",
        subtitle = "Future meal planning kept separate from consumed food.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FPL_015,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FPL_013,
        onNavigate = onNavigate,
    ) {
            MFStageList(listOf("Checking preferences","Matching meal options","Balancing the week","Checking conflicts","Preparing proposal"), 2)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FPL014GeneratingMealPlanScreenPreview() {
    MoveFuelTheme { FPL014GeneratingMealPlanScreen {} }
}

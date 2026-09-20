package com.movefuel.mufil2.ui.screens.fpl

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FPL018SwapMealScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FPL_018",
        title = "Swap Meal",
        subtitle = "Future meal planning kept separate from consumed food.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FPL_019,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FPL_017,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Chicken rice bowl","Current meal",true)
            MFOptionCard("Turkey grain bowl","Alternative")
            MFOptionCard("Tofu grain bowl","Alternative")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FPL018SwapMealScreenPreview() {
    MoveFuelTheme { FPL018SwapMealScreen {} }
}

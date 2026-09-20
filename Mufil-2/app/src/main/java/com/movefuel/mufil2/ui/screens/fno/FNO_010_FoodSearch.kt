package com.movefuel.mufil2.ui.screens.fno

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FNO010FoodSearchScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FNO_010",
        title = "Food Search",
        subtitle = "Confirmed nutrition for the selected day.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FNO_011,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FNO_009,
        onNavigate = onNavigate,
    ) {
            MFField("Search foods", "chicken")
            MFListItem("Chicken breast","Trusted food","Open")
            MFListItem("Chicken thigh","Trusted food","Open")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FNO010FoodSearchScreenPreview() {
    MoveFuelTheme { FNO010FoodSearchScreen {} }
}

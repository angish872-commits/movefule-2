package com.movefuel.mufil2.ui.screens.fno

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FNO016SavedMealsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FNO_016",
        title = "Saved Meals",
        subtitle = "Confirmed nutrition for the selected day.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FNO_017,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FNO_015,
        onNavigate = onNavigate,
    ) {
            MFListItem("Breakfast", "Most recent", "Open")
            MFListItem("Chicken rice bowl", "Frequent meal", "Reuse")
            MFListItem("Greek yogurt snack", "Favorite", "Add")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FNO016SavedMealsScreenPreview() {
    MoveFuelTheme { FNO016SavedMealsScreen {} }
}

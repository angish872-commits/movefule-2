package com.movefuel.mufil2.ui.screens.bar

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun BAR009AddToMealScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "BAR_009",
        title = "Add to Meal",
        subtitle = "Barcode and nutrition-label capture with fallback entry.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.BAR_010,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.BAR_008,
        onNavigate = onNavigate,
    ) {
            MFListItem("Detected barcode", "0123456789012", "Review")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun BAR009AddToMealScreenPreview() {
    MoveFuelTheme { BAR009AddToMealScreen {} }
}

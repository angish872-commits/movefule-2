package com.movefuel.mufil2.ui.screens.fno

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FNO009AddFoodMenuScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FNO_009",
        title = "Add Food Menu",
        subtitle = "Confirmed nutrition for the selected day.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FNO_010,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FNO_008,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Camera","Photograph a meal")
            MFOptionCard("Barcode","Scan packaged food")
            MFOptionCard("Search","Find a trusted food")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FNO009AddFoodMenuScreenPreview() {
    MoveFuelTheme { FNO009AddFoodMenuScreen {} }
}

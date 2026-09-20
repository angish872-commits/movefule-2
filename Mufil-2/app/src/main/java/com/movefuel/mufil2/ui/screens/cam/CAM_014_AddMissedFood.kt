package com.movefuel.mufil2.ui.screens.cam

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAM014AddMissedFoodScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAM_014",
        title = "Add Missed Food",
        subtitle = "Food photo and gallery analysis with explicit review.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAM_015,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAM_013,
        onNavigate = onNavigate,
    ) {
            MFField("Food", "Chicken breast")
            MFListItem("Suggested match", "Trusted food database result", "Use")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAM014AddMissedFoodScreenPreview() {
    MoveFuelTheme { CAM014AddMissedFoodScreen {} }
}

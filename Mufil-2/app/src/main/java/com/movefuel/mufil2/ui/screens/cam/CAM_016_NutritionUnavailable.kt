package com.movefuel.mufil2.ui.screens.cam

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAM016NutritionUnavailableScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAM_016",
        title = "Nutrition Unavailable",
        subtitle = "Food photo and gallery analysis with explicit review.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAM_017,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAM_015,
        onNavigate = onNavigate,
    ) {
            MFNotice("Analysis unavailable", "Your photo is preserved. Retry, search manually, or choose another image.", "Retry")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAM016NutritionUnavailableScreenPreview() {
    MoveFuelTheme { CAM016NutritionUnavailableScreen {} }
}

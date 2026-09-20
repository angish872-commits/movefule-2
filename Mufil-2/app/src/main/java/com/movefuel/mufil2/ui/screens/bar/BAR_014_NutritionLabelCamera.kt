package com.movefuel.mufil2.ui.screens.bar

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun BAR014NutritionLabelCameraScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "BAR_014",
        title = "Nutrition Label Camera",
        subtitle = "Barcode and nutrition-label capture with fallback entry.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.BAR_015,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.BAR_013,
        onNavigate = onNavigate,
    ) {
            MFMediaPanel("Barcode scanner", "Align the code inside the scan guide.", false)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun BAR014NutritionLabelCameraScreenPreview() {
    MoveFuelTheme { BAR014NutritionLabelCameraScreen {} }
}

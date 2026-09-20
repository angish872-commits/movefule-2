package com.movefuel.mufil2.ui.screens.cam

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAM001FoodCameraScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAM_001",
        title = "Food Camera",
        subtitle = "Food photo and gallery analysis with explicit review.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAM_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TOD_012,
        onNavigate = onNavigate,
    ) {
            MFMediaPanel(title = "Food camera", supporting = "Keep the meal inside the guide so MoveFuel can analyze it.", loading = false)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAM001FoodCameraScreenPreview() {
    MoveFuelTheme { CAM001FoodCameraScreen {} }
}

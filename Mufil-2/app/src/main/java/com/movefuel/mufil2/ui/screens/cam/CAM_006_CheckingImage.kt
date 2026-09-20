package com.movefuel.mufil2.ui.screens.cam

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAM006CheckingImageScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAM_006",
        title = "Checking Image",
        subtitle = "Food photo and gallery analysis with explicit review.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAM_007,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAM_005,
        onNavigate = onNavigate,
    ) {
            MFMediaPanel("Captured meal", "Image remains visible while analysis continues.")
            MFStageList(listOf("Checking image","Detecting foods","Estimating portions","Matching nutrition","Preparing review"), 0)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAM006CheckingImageScreenPreview() {
    MoveFuelTheme { CAM006CheckingImageScreen {} }
}
